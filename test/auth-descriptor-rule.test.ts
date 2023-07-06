import testUser from "./util/test-user";
import AccountBuilder from "./util/account-builder";
import { Connection, ftUserSession } from "../client/lib/ft4/types";
import { Asset } from "../client/lib/ft4/asset/types";
import { Account, User } from "../client/lib/ft4/accounts/types";
import { AuthDescriptorRule } from "../client/lib/ft4/accounts/auth-descriptor/types";
import {
  createChromiaClient,
  getNewAsset,
  getUserSession,
} from "./util/blockchain-util";
import { allow } from "../client/lib/ft4/accounts/auth-descriptor/rules";
import { createAmount } from "../client/lib/ft4/asset/amount";
import {
  createAuthDataService,
  createConnection,
  createSession,
} from "/ft4/ft-session";
import {
  addAuthDescriptorTo,
  createAccount,
  createTestAuthDescriptor,
} from "./util/util";
import { createAuthenticator } from "/ft4/authentication";
import { createInMemoryFtKeyStore } from "/ft4/authentication/ft/key-stores/in-memory";
import { newSignatureProvider } from "postchain-client";
import { deleteAllAuthDescriptorsExclude } from "/ft4/accounts/account-operations";

let _ft: ftUserSession;
let _connection: Connection;
let asset: Asset;

function sourceAccount(user: User): Promise<Account> {
  return AccountBuilder.account(_ft.changeUser(user))
    .withBalance(asset, 200)
    .withPoints(5)
    .build();
}

function destinationAccount(): Promise<Account> {
  return AccountBuilder.account(_ft.changeUser(testUser())).build();
}

async function getUserAndAccountFromAuthDescriptorRule(
  rule: AuthDescriptorRule
): Promise<[User, Account]> {
  //to be used when you don't need the admin user
  const user1 = testUser();
  const user2 = testUser(rule);
  const account = await sourceAccount(user1);

  await addAuthDescriptorTo(_connection.client, account.id, user1, user2);

  const accounts = await _ft.get.account.by.authDescriptorId(
    user2.authDescriptor.id
  );
  if (accounts.length > 1) throw new Error("Found more than one account");

  return [user2, accounts[0]];
}

describe("Auth Descriptor Rule", () => {
  beforeAll(async () => {
    _ft = await getUserSession();
    asset = await getNewAsset(_ft);
    _connection = createConnection(await createChromiaClient());
  });

  it("should succeed when number of called operations is less than or equal to value set by operation count rule", async () => {
    const [limitedUser, account] =
      await getUserAndAccountFromAuthDescriptorRule(
        allow.operationCount.lessOrEqual(2).only
      );
    const ft = _ft.changeUser(limitedUser);

    const account2 = await destinationAccount();

    const op1Promise = ft.account.token.transfer(
      account.id,
      account2.id,
      asset.id,
      createAmount(10, asset.decimals)
    );
    await expect(op1Promise).resolves.not.toThrowError();

    const op2Promise = ft.account.token.transfer(
      account.id,
      account2.id,
      asset.id,
      createAmount(20, asset.decimals)
    );
    await expect(op2Promise).resolves.not.toThrowError();
  });

  it("should fail when number of called operations is greater than value set by operation count rule", async () => {
    const [limitedUser, account] =
      await getUserAndAccountFromAuthDescriptorRule(
        allow.operationCount.lessThan(2).only
      );
    const ft = _ft.changeUser(limitedUser);

    const account2 = await destinationAccount();

    const op1Promise = ft.account.token.transfer(
      account.id,
      account2.id,
      asset.id,
      createAmount(10, asset.decimals)
    );
    await expect(op1Promise).resolves.not.toThrowError();

    const op2Promise = ft.account.token.transfer(
      account.id,
      account2.id,
      asset.id,
      createAmount(20, asset.decimals)
    );
    await expect(op2Promise).rejects.toThrowError();
  });

  it.skip("should fail when current time is greater than time defined by 'less than' block time rule", async () => {
    const [limitedUser, account] =
      await getUserAndAccountFromAuthDescriptorRule(
        allow.blockTime.lessThan(Date.now() - 10000).only
      );
    const ft = _ft.changeUser(limitedUser);

    const account2 = await destinationAccount();

    const opPromise = ft.account.token.transfer(
      account.id,
      account2.id,
      asset.id,
      createAmount(10, asset.decimals)
    );
    await expect(opPromise).rejects.toThrowError();
  });

  it("should succeed when current time is less than time defined by 'less than' block time rule", async () => {
    const [limitedUser, account] =
      await getUserAndAccountFromAuthDescriptorRule(
        allow.blockTime.lessThan(Date.now() + 10000).only
      );
    const ft = _ft.changeUser(limitedUser);

    const account2 = await destinationAccount();

    const opPromise = ft.account.token.transfer(
      account.id,
      account2.id,
      asset.id,
      createAmount(10, asset.decimals)
    );
    await expect(opPromise).resolves.not.toThrowError();
  });

  it("should succeed when current block height is less than value defined by 'less than' block height rule", async () => {
    const [limitedUser, account] =
      await getUserAndAccountFromAuthDescriptorRule(
        allow.blockHeight.lessThan(10000).only
      );
    const ft = _ft.changeUser(limitedUser);

    const account2 = await destinationAccount();

    const opPromise = ft.account.token.transfer(
      account.id,
      account2.id,
      asset.id,
      createAmount(10, asset.decimals)
    );
    await expect(opPromise).resolves.not.toThrowError();
  });

  it("should fail when current block height is greater than value defined by 'less than' block height rule", async () => {
    const [limitedUser, account] =
      await getUserAndAccountFromAuthDescriptorRule(
        allow.blockHeight.lessThan(1).only
      );
    const ft = _ft.changeUser(limitedUser);

    const account2 = await destinationAccount();

    const opPromise = ft.account.token.transfer(
      account.id,
      account2.id,
      asset.id,
      createAmount(10, asset.decimals)
    );
    await expect(opPromise).rejects.toThrowError();
  });

  it("should fail if operation is executed before timestamp defined by 'greater than' block time rule", async () => {
    const [limitedUser, account] =
      await getUserAndAccountFromAuthDescriptorRule(
        allow.blockTime.greaterThan(Date.now() + 10000).only
      );
    const ft = _ft.changeUser(limitedUser);

    const account2 = await destinationAccount();

    const opPromise = ft.account.token.transfer(
      account.id,
      account2.id,
      asset.id,
      createAmount(10, asset.decimals)
    );
    await expect(opPromise).rejects.toThrowError();
  });

  it.skip("should succeed if operation is executed after timestamp defined by 'greater than' block time rule", async () => {
    const [limitedUser, account] =
      await getUserAndAccountFromAuthDescriptorRule(
        allow.blockTime.greaterThan(Date.now() - 10000).only
      );
    const ft = _ft.changeUser(limitedUser);

    const account2 = await destinationAccount();

    const opPromise = ft.account.token.transfer(
      account.id,
      account2.id,
      asset.id,
      createAmount(10, asset.decimals)
    );
    await expect(opPromise).resolves.not.toThrowError();
  });

  it("should fail if operation is executed before block defined by 'greater than' block height rule", async () => {
    const [limitedUser, account] =
      await getUserAndAccountFromAuthDescriptorRule(
        allow.blockHeight.greaterThan(10000).only
      );
    const ft = _ft.changeUser(limitedUser);

    const account2 = await destinationAccount();

    const opPromise = ft.account.token.transfer(
      account.id,
      account2.id,
      asset.id,
      createAmount(10, asset.decimals)
    );
    await expect(opPromise).rejects.toThrowError();
  });

  it("should succeed if operation is executed after block defined by 'greater than' block height rule", async () => {
    const [limitedUser, account] =
      await getUserAndAccountFromAuthDescriptorRule(
        allow.blockHeight.greaterThan(1).only
      );
    const ft = _ft.changeUser(limitedUser);

    const account2 = await destinationAccount();

    const opPromise = ft.account.token.transfer(
      account.id,
      account2.id,
      asset.id,
      createAmount(10, asset.decimals)
    );
    await expect(opPromise).resolves.not.toThrowError();
  });

  it("should be able to create complex rules", async () => {
    const [limitedUser, account] =
      await getUserAndAccountFromAuthDescriptorRule(
        allow.blockHeight.greaterThan(1).and.blockHeight.lessThan(10000).only
      );
    const ft = _ft.changeUser(limitedUser);

    const account2 = await destinationAccount();

    const opPromise = ft.account.token.transfer(
      account.id,
      account2.id,
      asset.id,
      createAmount(10, asset.decimals)
    );
    await expect(opPromise).resolves.not.toThrowError();
  });

  it("should fail if block heights defined by 'greater than' and 'less than' block height rules are less than current block height", async () => {
    const [limitedUser, account] =
      await getUserAndAccountFromAuthDescriptorRule(
        allow.blockHeight.greaterThan(1).and.blockHeight.lessThan(10).only
      );
    const ft = _ft.changeUser(limitedUser);

    const account2 = await destinationAccount();

    const opPromise = ft.account.token.transfer(
      account.id,
      account2.id,
      asset.id,
      createAmount(10, asset.decimals)
    );
    await expect(opPromise).rejects.toThrowError();
  });

  it("should fail if block times defined by 'greater than' and 'less than' block time rules are in the past", async () => {
    const rules = allow.blockTime
      .greaterThan(Date.now() - 20000)
      .and.blockTime.lessThan(Date.now() - 10000).only;
    const [limitedUser, account] =
      await getUserAndAccountFromAuthDescriptorRule(rules);
    const ft = _ft.changeUser(limitedUser);

    const account2 = await destinationAccount();

    const opPromise = ft.account.token.transfer(
      account.id,
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
    const [limitedUser, account] =
      await getUserAndAccountFromAuthDescriptorRule(rules);
    const ft = _ft.changeUser(limitedUser);

    const account2 = await destinationAccount();

    const opPromise = ft.account.token.transfer(
      account.id,
      account2.id,
      asset.id,
      createAmount(10, asset.decimals)
    );
    await expect(opPromise).resolves.not.toThrowError();
  });

  it("should delete expired auth descriptor", async () => {
    const user1 = testUser();
    const user2 = testUser(allow.operationCount.lessThan(2).only);

    let srcAccount1 = await sourceAccount(user1);
    const destAccount = await destinationAccount();

    // add expiring auth descriptor to the account
    await addAuthDescriptorTo(_connection.client, srcAccount1.id, user1, user2);

    // get the session initialized with user2
    // object which contains expiring auth descriptor
    const ft2 = _ft.changeUser(user2);

    await ft2.account.token.transfer(
      srcAccount1.id,
      destAccount.id,
      asset.id,
      createAmount(10, asset.decimals)
    );

    // account descriptor used by user2 object has expired.
    // this operation call will delete it.
    // any other operation, which calls require_auth internally
    // would also delete expired auth descriptor.
    await _ft
      .changeUser(user1)
      .account.token.transfer(
        srcAccount1.id,
        destAccount.id,
        asset.id,
        createAmount(30, asset.decimals)
      );

    srcAccount1 = await _ft.get.account.by.id(srcAccount1.id);

    expect(srcAccount1.authDescriptors.length).toEqual(1);
  });

  it("shouldn't delete non-expired auth descriptor", async () => {
    const user1 = testUser();
    const user2 = testUser(allow.operationCount.lessThan(10).only);

    let srcAccount1 = await sourceAccount(user1);
    const destAccount = await destinationAccount();

    // add expiring auth descriptor to the account
    await addAuthDescriptorTo(_connection.client, srcAccount1.id, user1, user2);

    // get the session initialized with user2
    // object which contains expiring auth descriptor
    const ft2 = _ft.changeUser(user2);

    // perform transfer with expiring auth descriptor.
    // auth descriptor didn't expire, because it's only used 1 out of 10 times.
    await ft2.account.token.transfer(
      srcAccount1.id,
      destAccount.id,
      asset.id,
      createAmount(10, asset.decimals)
    );

    // perform transfer using auth descriptor without rules
    await ft2.account.token.transfer(
      srcAccount1.id,
      destAccount.id,
      asset.id,
      createAmount(10, asset.decimals)
    );

    srcAccount1 = await _ft.get.account.by.id(srcAccount1.id);

    expect(srcAccount1.authDescriptors.length).toEqual(2);
  });

  it("should delete only expired auth descriptor if multiple expiring descriptors exist", async () => {
    const user1 = testUser();
    const user2 = testUser(allow.operationCount.lessOrEqual(1).only);
    const user3 = testUser(allow.operationCount.lessOrEqual(1).only);

    let srcAccount1 = await sourceAccount(user1);
    const destAccount = await destinationAccount();

    await addAuthDescriptorTo(_connection.client, srcAccount1.id, user1, user2);
    await addAuthDescriptorTo(_connection.client, srcAccount1.id, user1, user3);

    const ft2 = _ft.changeUser(user2);

    await ft2.account.token.transfer(
      srcAccount1.id,
      destAccount.id,
      asset.id,
      createAmount(50, asset.decimals)
    );

    // this call will trigger deletion of expired auth descriptor (attached to user2)
    await _ft
      .changeUser(user1)
      .account.token.transfer(
        srcAccount1.id,
        destAccount.id,
        asset.id,
        createAmount(100, asset.decimals)
      );

    srcAccount1 = await _ft.get.account.by.id(srcAccount1.id);

    expect(srcAccount1.authDescriptors.length).toEqual(2);
  });

  it("should add auth descriptors", async () => {
    const user1 = testUser();
    const user2 = testUser(allow.operationCount.lessOrEqual(1).only);
    const user3 = testUser(allow.operationCount.lessOrEqual(1).only);

    let account = await sourceAccount(user1);

    await addAuthDescriptorTo(_connection.client, account.id, user1, user2);
    await addAuthDescriptorTo(_connection.client, account.id, user1, user3);

    account = await _ft.get.account.by.id(account.id);

    expect(account.authDescriptors.length).toEqual(3);
  });

  it("should delete auth descriptors", async () => {
    const { keyPair: kp1, authDescriptor: ad1 } = createTestAuthDescriptor([
      "A",
    ]);
    const { keyPair: kp2, authDescriptor: ad2 } = createTestAuthDescriptor(
      ["A"],
      allow.operationCount.lessOrEqual(1).only
    );
    const { keyPair: kp3, authDescriptor: ad3 } = createTestAuthDescriptor(
      ["A"],
      allow.operationCount.lessOrEqual(1).only
    );

    const accountId = await createAccount(_connection.client, ad1);

    const user1 = {
      signatureProvider: newSignatureProvider(kp1),
      authDescriptor: ad1,
    };
    const user2 = {
      signatureProvider: newSignatureProvider(kp2),
      authDescriptor: ad2,
    };
    const user3 = {
      signatureProvider: newSignatureProvider(kp3),
      authDescriptor: ad3,
    };

    await addAuthDescriptorTo(_connection.client, accountId, user1, user2);
    await addAuthDescriptorTo(_connection.client, accountId, user1, user3);

    const keyHandler = createInMemoryFtKeyStore(kp1).createKeyHandler(ad1);

    const authDataService = createAuthDataService(_connection);

    const session = createSession(
      _connection,
      createAuthenticator(ad1.id, [keyHandler], authDataService)
    );

    expect((await session.account.getAuthDescriptors()).length).toEqual(3);

    const tx = await session
      .transactionBuilder()
      .add(deleteAllAuthDescriptorsExclude(session.account.id, ad1.id))
      .build();
    await _connection.client.sendTransaction(tx);

    expect((await session.account.getAuthDescriptors()).length).toEqual(1);
  });

  // Skipped due to possible bug in postchain-client 1.5.4
  it.skip("should fail when deleting an auth descriptor which is not owned by the account", async () => {
    const { keyPair: kp1, authDescriptor: ad1 } = createTestAuthDescriptor([
      "A",
    ]);
    const { authDescriptor: ad2 } = createTestAuthDescriptor(["A"]);

    await createAccount(_connection.client, ad1);
    await createAccount(_connection.client, ad2);

    const keyHandler = createInMemoryFtKeyStore(kp1).createKeyHandler(ad1);
    const authDataService = createAuthDataService(_connection);

    const session = createSession(
      _connection,
      createAuthenticator(ad1.id, [keyHandler], authDataService)
    );

    const promise = session.account.deleteAuthDescriptor(ad2.id);
    await expect(promise).rejects.toThrowError();
  });

  it("should delete auth descriptor", async () => {
    const { keyPair: kp1, authDescriptor: ad1 } = createTestAuthDescriptor([
      "A",
    ]);
    const { keyPair: kp2, authDescriptor: ad2 } = createTestAuthDescriptor([
      "A",
    ]);

    const accountId = await createAccount(_connection.client, ad1);

    const user1 = {
      signatureProvider: newSignatureProvider(kp1),
      authDescriptor: ad1,
    };
    const user2 = {
      signatureProvider: newSignatureProvider(kp2),
      authDescriptor: ad2,
    };

    await addAuthDescriptorTo(_connection.client, accountId, user1, user2);

    const keyHandler = createInMemoryFtKeyStore(kp1).createKeyHandler(ad1);
    const authDataService = createAuthDataService(_connection);

    const session = createSession(
      _connection,
      createAuthenticator(ad1.id, [keyHandler], authDataService)
    );
    await session.account.deleteAuthDescriptor(ad2.id);

    expect((await session.account.getAuthDescriptors()).length).toEqual(1);
  });

  it("Should be able to create same rules with different value", async () => {
    const rules = allow.blockHeight
      .greaterThan(1)
      .and.blockHeight.greaterThan(10000)
      .and.blockTime.greaterOrEqual(122222999).only;

    const user1 = testUser();
    const user2 = testUser(rules);
    const account = await sourceAccount(user1);

    const txInfo = await addAuthDescriptorTo(
      _connection.client,
      account.id,
      user1,
      user2
    );
    expect(txInfo.status).toBe("confirmed");
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
      addAuthDescriptorTo(_connection.client, account.id, user1, user2)
    ).rejects.toThrowError();
  });

  it("shouldn't be able to create an account with an expiring auth descriptor", async () => {
    const user = testUser(allow.operationCount.lessOrEqual(2).only);

    const createPromise = sourceAccount(user);
    await expect(createPromise).rejects.toThrowError();
  });
});
