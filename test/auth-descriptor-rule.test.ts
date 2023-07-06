/* eslint @typescript-eslint/no-unused-vars: 0 */
import testUser from "./util/test-user";
import AccountBuilder from "./util/account-builder";
import { Connection, ftUserSession } from "../client/lib/ft4/types";
import { Asset } from "../client/lib/ft4/asset/types";
import { IAuthenticatedAccount, User } from "../client/lib/ft4/accounts/types";
import { AuthDescriptorRule } from "../client/lib/ft4/accounts/auth-descriptor/types";
import {
  _getNewAsset,
  createChromiaClient,
  getUserSession,
} from "./util/blockchain-util";
import { allow } from "../client/lib/ft4/accounts/auth-descriptor/rules";
import { createAmount } from "../client/lib/ft4/asset/amount";
import { createAuthDataService, createConnection } from "/ft4/ft-session";
import { createInMemoryFtKeyStore } from "/ft4/authentication/ft/key-stores/in-memory";
import { createAuthenticator } from "/ft4/authentication";
import { createAuthenticatedAccount } from "/ft4/accounts/account-op-functions";

let _ft: ftUserSession;
let connection: Connection;
let asset: Asset;

function sourceAccount(user: User): Promise<IAuthenticatedAccount> {
  return AccountBuilder.account(_ft.changeUser(user))
    .withBalance(asset, 200)
    .withPoints(5)
    .buildAuthenticated();
}

function destinationAccount(): Promise<IAuthenticatedAccount> {
  return AccountBuilder.account(
    _ft.changeUser(testUser())
  ).buildAuthenticated();
}

async function getAuthedAccountsFromAuthDescriptorRule(
  rule: AuthDescriptorRule
): Promise<[limited: IAuthenticatedAccount, admin: IAuthenticatedAccount]> {
  //to be used when you don't need the admin user
  const user1 = testUser();
  const user2 = testUser(rule);
  const adminAccount = await sourceAccount(user1);

  await adminAccount.addAuthDescriptor(
    user2.authDescriptor,
    user2.signatureProvider
  );

  const accounts = await connection.getAccountsByAuthDescriptorIdPaginated(
    user2.authDescriptor.id
  );
  if (accounts.data.length > 1) throw new Error("Found more than one account");

  const keyHandler = createInMemoryFtKeyStore(
    user2.signatureProvider
  ).createKeyHandler(user2.authDescriptor);
  const authenticator = createAuthenticator(
    adminAccount.id,
    [keyHandler],
    createAuthDataService(connection)
  );
  const limitedAccount = createAuthenticatedAccount(connection, authenticator);

  return [limitedAccount, adminAccount];
}

describe("Auth Descriptor Rule", () => {
  beforeAll(async () => {
    _ft = await getUserSession();
    connection = createConnection(await createChromiaClient());
    asset = await _getNewAsset(connection);
  });

  it("should succeed when number of called operations is less than or equal to value set by operation count rule", async () => {
    const [limited, admin] = await getAuthedAccountsFromAuthDescriptorRule(
      allow.operationCount.lessOrEqual(2).only
    );

    const account2 = await destinationAccount();

    const op1Promise = limited.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals)
    );
    await expect(op1Promise).resolves.not.toThrowError();

    const op2Promise = limited.transfer(
      account2.id,
      asset.id,
      createAmount(20, asset.decimals)
    );
    await expect(op2Promise).resolves.not.toThrowError();
  });

  it("should fail when number of called operations is greater than value set by operation count rule", async () => {
    const [limited, admin] = await getAuthedAccountsFromAuthDescriptorRule(
      allow.operationCount.lessThan(2).only
    );

    const account2 = await destinationAccount();

    const op1Promise = limited.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals)
    );
    await expect(op1Promise).resolves.not.toThrowError();

    const op2Promise = limited.transfer(
      account2.id,
      asset.id,
      createAmount(20, asset.decimals)
    );
    await expect(op2Promise).rejects.toThrowError();
  });

  it.skip("should fail when current time is greater than time defined by 'less than' block time rule", async () => {
    const [limited, admin] = await getAuthedAccountsFromAuthDescriptorRule(
      allow.blockTime.lessThan(Date.now() - 10000).only
    );

    const account2 = await destinationAccount();

    const opPromise = limited.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals)
    );
    await expect(opPromise).rejects.toThrowError();
  });

  it("should succeed when current time is less than time defined by 'less than' block time rule", async () => {
    const [limited, admin] = await getAuthedAccountsFromAuthDescriptorRule(
      allow.blockTime.lessThan(Date.now() + 10000).only
    );

    const account2 = await destinationAccount();

    const opPromise = limited.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals)
    );
    await expect(opPromise).resolves.not.toThrowError();
  });

  it("should succeed when current block height is less than value defined by 'less than' block height rule", async () => {
    const [limited, admin] = await getAuthedAccountsFromAuthDescriptorRule(
      allow.blockHeight.lessThan(10000).only
    );

    const account2 = await destinationAccount();

    const opPromise = limited.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals)
    );
    await expect(opPromise).resolves.not.toThrowError();
  });

  it.skip("should fail when current block height is greater than value defined by 'less than' block height rule", async () => {
    const [limited, admin] = await getAuthedAccountsFromAuthDescriptorRule(
      allow.blockHeight.lessThan(1).only
    );

    const account2 = await destinationAccount();

    const opPromise = limited.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals)
    );
    await expect(opPromise).rejects.toThrowError();
  });

  it.skip("should fail if operation is executed before timestamp defined by 'greater than' block time rule", async () => {
    const [limited, admin] = await getAuthedAccountsFromAuthDescriptorRule(
      allow.blockTime.greaterThan(Date.now() + 10000).only
    );

    const account2 = await destinationAccount();

    const opPromise = limited.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals)
    );
    await expect(opPromise).rejects.toThrowError();
  });

  it.skip("should succeed if operation is executed after timestamp defined by 'greater than' block time rule", async () => {
    const [limited, admin] = await getAuthedAccountsFromAuthDescriptorRule(
      allow.blockTime.greaterThan(Date.now() - 10000).only
    );

    const account2 = await destinationAccount();

    const opPromise = limited.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals)
    );
    await expect(opPromise).resolves.not.toThrowError();
  });

  it.skip("should fail if operation is executed before block defined by 'greater than' block height rule", async () => {
    const [limited, admin] = await getAuthedAccountsFromAuthDescriptorRule(
      allow.blockHeight.greaterThan(10000).only
    );

    const account2 = await destinationAccount();

    const opPromise = limited.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals)
    );
    await expect(opPromise).rejects.toThrowError();
  });

  it("should succeed if operation is executed after block defined by 'greater than' block height rule", async () => {
    const [limited, admin] = await getAuthedAccountsFromAuthDescriptorRule(
      allow.blockHeight.greaterThan(1).only
    );

    const account2 = await destinationAccount();

    const opPromise = limited.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals)
    );
    await expect(opPromise).resolves.not.toThrowError();
  });

  it("should be able to create complex rules", async () => {
    const [limited, admin] = await getAuthedAccountsFromAuthDescriptorRule(
      allow.blockHeight.greaterThan(1).and.blockHeight.lessThan(10000).only
    );

    const account2 = await destinationAccount();

    const opPromise = limited.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals)
    );
    await expect(opPromise).resolves.not.toThrowError();
  });

  it.skip("should fail if block heights defined by 'greater than' and 'less than' block height rules are less than current block height", async () => {
    const [limited, admin] = await getAuthedAccountsFromAuthDescriptorRule(
      allow.blockHeight.greaterThan(1).and.blockHeight.lessThan(10).only
    );

    const account2 = await destinationAccount();

    const opPromise = limited.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals)
    );
    await expect(opPromise).rejects.toThrowError();
  });

  it.skip("should fail if block times defined by 'greater than' and 'less than' block time rules are in the past", async () => {
    const rules = allow.blockTime
      .greaterThan(Date.now() - 20000)
      .and.blockTime.lessThan(Date.now() - 10000).only;
    const [limited, admin] = await getAuthedAccountsFromAuthDescriptorRule(
      rules
    );

    const account2 = await destinationAccount();

    const opPromise = limited.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals)
    );
    await expect(opPromise).rejects.toThrowError();
  });

  it.skip("should succeed if current time is within period defined by 'greater than' and 'less than' block time rules", async () => {
    const rules = allow.blockTime
      .greaterThan(Date.now() - 10000)
      .and.blockTime.lessThan(Date.now() + 10000).only;
    const [limited, admin] = await getAuthedAccountsFromAuthDescriptorRule(
      rules
    );

    const account2 = await destinationAccount();

    const opPromise = limited.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals)
    );
    await expect(opPromise).resolves.not.toThrowError();
  });

  it("should delete expired auth descriptor", async () => {
    const rules = allow.operationCount.lessThan(2).only;

    const [limited, admin] = await getAuthedAccountsFromAuthDescriptorRule(
      rules
    );

    const destAccount = await destinationAccount();

    await limited.transfer(
      destAccount.id,
      asset.id,
      createAmount(10, asset.decimals)
    );

    // account descriptor used by user2 object has expired.
    // this operation call will delete it.
    // any other operation, which calls require_auth internally
    // would also delete expired auth descriptor.
    await admin.transfer(
      destAccount.id,
      asset.id,
      createAmount(30, asset.decimals)
    );

    expect((await admin.getAuthDescriptorsPaginated()).data.length).toEqual(1);
  });

  it("shouldn't delete non-expired auth descriptor", async () => {
    const rules = allow.operationCount.lessThan(10).only;

    const [limited, admin] = await getAuthedAccountsFromAuthDescriptorRule(
      rules
    );

    const destAccount = await destinationAccount();

    // perform transfer with expiring auth descriptor.
    // auth descriptor didn't expire, because it's only used 1 out of 10 times.
    await limited.transfer(
      destAccount.id,
      asset.id,
      createAmount(10, asset.decimals)
    );

    // perform transfer using auth descriptor without rules
    await limited.transfer(
      destAccount.id,
      asset.id,
      createAmount(10, asset.decimals)
    );

    expect((await admin.getAuthDescriptorsPaginated()).data.length).toEqual(2);
  });

  it("should delete only expired auth descriptor if multiple expiring descriptors exist", async () => {
    const rules = allow.operationCount.lessOrEqual(1).only;
    const user3 = testUser(allow.operationCount.lessOrEqual(1).only);

    const [limited, admin] = await getAuthedAccountsFromAuthDescriptorRule(
      rules
    );

    const destAccount = await destinationAccount();

    await admin.addAuthDescriptor(
      user3.authDescriptor,
      user3.signatureProvider
    );

    await limited.transfer(
      destAccount.id,
      asset.id,
      createAmount(50, asset.decimals)
    );

    // this call will trigger deletion of expired auth descriptor (attached to user2)
    await admin.transfer(
      destAccount.id,
      asset.id,
      createAmount(100, asset.decimals)
    );

    expect((await admin.getAuthDescriptorsPaginated()).data.length).toEqual(2);
  });

  it("should add auth descriptors", async () => {
    const rules = allow.operationCount.lessOrEqual(1).only;
    const user3 = testUser(allow.operationCount.lessOrEqual(1).only);

    const [limited, admin] = await getAuthedAccountsFromAuthDescriptorRule(
      rules
    );

    await admin.addAuthDescriptor(
      user3.authDescriptor,
      user3.signatureProvider
    );

    expect((await admin.getAuthDescriptorsPaginated()).data.length).toEqual(3);
  });

  it("should delete auth descriptors", async () => {
    const rules = allow.operationCount.lessOrEqual(1).only;
    const user1 = testUser();

    const ft = (await getUserSession()).changeUser(user1);

    const user2 = testUser(rules);
    const user3 = testUser(allow.operationCount.lessOrEqual(1).only);
    const admin = await sourceAccount(user1);

    await admin.addAuthDescriptor(
      user2.authDescriptor,
      user2.signatureProvider
    );
    await admin.addAuthDescriptor(
      user3.authDescriptor,
      user3.signatureProvider
    );

    expect((await admin.getAuthDescriptorsPaginated()).data.length).toEqual(3);

    await ft.account.authDescriptor.deleteAllExcluding(
      user1.authDescriptor.id,
      user1.authDescriptor.id
    );

    expect((await admin.getAuthDescriptorsPaginated()).data.length).toEqual(1);
  });

  it("should fail when deleting an auth descriptor which is not owned by the account", async () => {
    const user1 = testUser();
    const user2 = testUser();

    const account1 = await sourceAccount(user1);
    await sourceAccount(user2);

    const promise = _ft
      .changeUser(user1)
      .account.authDescriptor.delete(user2.authDescriptor.id, account1.id);
    await expect(promise).rejects.toThrowError();
  });

  it("should delete auth descriptor", async () => {
    const user1 = testUser();
    const user2 = testUser();

    const account = await sourceAccount(user1);

    await account.addAuthDescriptor(
      user2.authDescriptor,
      user2.signatureProvider
    );
    expect((await account.getAuthDescriptorsPaginated()).data.length).toEqual(
      2
    );

    await account.deleteAuthDescriptor(user2.authDescriptor.id);
    expect((await account.getAuthDescriptorsPaginated()).data.length).toEqual(
      1
    );
  });

  it("Should be able to create same rules with different value", async () => {
    const rules = allow.blockHeight
      .greaterThan(1)
      .and.blockHeight.greaterThan(10000)
      .and.blockTime.greaterOrEqual(122222999).only;

    const user1 = testUser();
    const user2 = testUser(rules);
    const account = await sourceAccount(user1);

    await expect(
      account.addAuthDescriptor(user2.authDescriptor, user2.signatureProvider)
    ).resolves.toHaveProperty("status", "confirmed");
  });

  it.skip("shouldn't be able to create too many rules", async () => {
    let rules = allow.blockHeight
      .greaterThan(1)
      .and.blockHeight.greaterThan(10000)
      .and.blockTime.greaterOrEqual(122222999);
    for (let i = 0; i < 400; i++) {
      rules = rules.and.blockHeight.greaterOrEqual(i);
    }

    const user1 = testUser();
    const user2 = testUser(rules.only);
    const account = await sourceAccount(user1);

    await expect(
      account.addAuthDescriptor(user2.authDescriptor, user2.signatureProvider)
    ).rejects.toThrowError();
  });

  it("shouldn't be able to create an account with an expiring auth descriptor", async () => {
    const user = testUser(allow.operationCount.lessOrEqual(2).only);

    const createPromise = sourceAccount(user);
    await expect(createPromise).rejects.toThrowError();
  });
});
