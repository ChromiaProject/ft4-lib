import testUser from "./util/test-user";
import AccountBuilder from "./util/account-builder";
import { Connection, ftUserSession } from "../client/lib/ft4/types";
import { Asset } from "../client/lib/ft4/asset/types";
import { AuthenticatedAccount, User } from "../client/lib/ft4/accounts/types";
import { AuthDescriptorRule } from "../client/lib/ft4/accounts/auth-descriptor/types";
import {
  _getNewAsset,
  createChromiaClient,
  getUserSession,
} from "./util/blockchain-util";
import { allow } from "../client/lib/ft4/accounts/auth-descriptor/rules";
import { createAmount } from "../client/lib/ft4/asset/amount";
import { IClient } from "postchain-client";
import { createAuthenticatedAccount } from "/ft4/accounts/account-op-functions";
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
import { _deleteAllAuthDescriptorsExclude } from "/ft4/accounts/account-operations";

let _ft: ftUserSession;
let _connection: Connection;
let asset: Asset;
let client: IClient;

function sourceAccount(user: User): Promise<AuthenticatedAccount> {
  return AccountBuilder.account(_ft.changeUser(user))
    .withBalance(asset, 200)
    .withPoints(5)
    .buildAuthenticated();
}

function destinationAccount(): Promise<AuthenticatedAccount> {
  return AccountBuilder.account(
    _ft.changeUser(testUser())
  ).buildAuthenticated();
}

async function getAuthedAccountsFromAuthDescriptorRule(
  rule: AuthDescriptorRule
): Promise<
  [limitedAccount: AuthenticatedAccount, accountAdmin: AuthenticatedAccount]
> {
  const user1 = testUser();
  const user2 = testUser(rule);
  const accountAdmin = await sourceAccount(user1);

  await accountAdmin.addAuthDescriptor(
    user2.authDescriptor,
    user2.signatureProvider
  );

  const accounts = await _connection.getAccountsByAuthDescriptorId(
    user2.authDescriptor.id
  );
  if (accounts.data.length > 1) throw new Error("Found more than one account");

  const keyHandler = createInMemoryFtKeyStore(
    user2.signatureProvider
  ).createKeyHandler(user2.authDescriptor);
  const authenticator = createAuthenticator(
    accountAdmin.id,
    [keyHandler],
    createAuthDataService(_connection)
  );
  const limitedAccount = createAuthenticatedAccount(_connection, authenticator);

  return [limitedAccount, accountAdmin];
}

describe("Auth Descriptor Rule", () => {
  beforeAll(async () => {
    _ft = await getUserSession();
    client = await createChromiaClient();
    _connection = createConnection(client);
    asset = await _getNewAsset(_connection);
  });

  it("should succeed when number of called operations is less than or equal to value set by operation count rule", async () => {
    const limitedAccount = (
      await getAuthedAccountsFromAuthDescriptorRule(
        allow.operationCount.lessOrEqual(2).only
      )
    )[0];

    const account2 = await destinationAccount();

    const op1Promise = limitedAccount.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals)
    );
    await expect(op1Promise).resolves.not.toThrowError();

    const op2Promise = limitedAccount.transfer(
      account2.id,
      asset.id,
      createAmount(20, asset.decimals)
    );
    await expect(op2Promise).resolves.not.toThrowError();
  });

  it("should fail when number of called operations is greater than value set by operation count rule", async () => {
    const limitedAccount = (
      await getAuthedAccountsFromAuthDescriptorRule(
        allow.operationCount.lessThan(2).only
      )
    )[0];

    const account2 = await destinationAccount();

    const op1Promise = limitedAccount.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals)
    );
    await expect(op1Promise).resolves.not.toThrowError();

    const op2Promise = limitedAccount.transfer(
      account2.id,
      asset.id,
      createAmount(20, asset.decimals)
    );
    await expect(op2Promise).rejects.toThrowError();
  });

  it("should fail when current time is greater than time defined by 'less than' block time rule", async () => {
    const limitedAccount = (
      await getAuthedAccountsFromAuthDescriptorRule(
        allow.blockTime.lessThan(Date.now() - 10000).only
      )
    )[0];

    const account2 = await destinationAccount();

    const opPromise = limitedAccount.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals)
    );
    await expect(opPromise).rejects.toThrowError();
  });

  it("should succeed when current time is less than time defined by 'less than' block time rule", async () => {
    const limitedAccount = (
      await getAuthedAccountsFromAuthDescriptorRule(
        allow.blockTime.lessThan(Date.now() + 10000).only
      )
    )[0];

    const account2 = await destinationAccount();

    const opPromise = limitedAccount.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals)
    );
    await expect(opPromise).resolves.not.toThrowError();
  });

  it("should succeed when current block height is less than value defined by 'less than' block height rule", async () => {
    const limitedAccount = (
      await getAuthedAccountsFromAuthDescriptorRule(
        allow.blockHeight.lessThan(10000).only
      )
    )[0];

    const account2 = await destinationAccount();

    const opPromise = limitedAccount.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals)
    );
    await expect(opPromise).resolves.not.toThrowError();
  });

  it("should fail when current block height is greater than value defined by 'less than' block height rule", async () => {
    const limitedAccount = (
      await getAuthedAccountsFromAuthDescriptorRule(
        allow.blockHeight.lessThan(1).only
      )
    )[0];

    const account2 = await destinationAccount();

    const opPromise = limitedAccount.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals)
    );
    await expect(opPromise).rejects.toThrowError();
  });

  it("should fail if operation is executed before timestamp defined by 'greater than' block time rule", async () => {
    const limitedAccount = (
      await getAuthedAccountsFromAuthDescriptorRule(
        allow.blockTime.greaterThan(Date.now() + 10000).only
      )
    )[0];

    const account2 = await destinationAccount();

    const opPromise = limitedAccount.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals)
    );
    await expect(opPromise).rejects.toThrowError();
  });

  it("should succeed if operation is executed after timestamp defined by 'greater than' block time rule", async () => {
    const limitedAccount = (
      await getAuthedAccountsFromAuthDescriptorRule(
        allow.blockTime.greaterThan(Date.now() - 10000).only
      )
    )[0];

    const account2 = await destinationAccount();

    const opPromise = limitedAccount.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals)
    );
    await expect(opPromise).resolves.not.toThrowError();
  });

  it("should fail if operation is executed before block defined by 'greater than' block height rule", async () => {
    const limitedAccount = (
      await getAuthedAccountsFromAuthDescriptorRule(
        allow.blockHeight.greaterThan(10000).only
      )
    )[0];

    const account2 = await destinationAccount();

    const opPromise = limitedAccount.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals)
    );
    await expect(opPromise).rejects.toThrowError();
  });

  it("should succeed if operation is executed after block defined by 'greater than' block height rule", async () => {
    const limitedAccount = (
      await getAuthedAccountsFromAuthDescriptorRule(
        allow.blockHeight.greaterThan(1).only
      )
    )[0];

    const account2 = await destinationAccount();

    const opPromise = limitedAccount.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals)
    );
    await expect(opPromise).resolves.not.toThrowError();
  });

  it("should be able to create complex rules", async () => {
    const limitedAccount = (
      await getAuthedAccountsFromAuthDescriptorRule(
        allow.blockHeight.greaterThan(1).and.blockHeight.lessThan(10000).only
      )
    )[0];

    const account2 = await destinationAccount();

    const opPromise = limitedAccount.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals)
    );
    await expect(opPromise).resolves.not.toThrowError();
  });

  it("should fail if block heights defined by 'greater than' and 'less than' block height rules are less than current block height", async () => {
    const limitedAccount = (
      await getAuthedAccountsFromAuthDescriptorRule(
        allow.blockHeight.greaterThan(1).and.blockHeight.lessThan(10).only
      )
    )[0];

    const account2 = await destinationAccount();

    const opPromise = limitedAccount.transfer(
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
    const limitedAccount = (
      await getAuthedAccountsFromAuthDescriptorRule(rules)
    )[0];

    const account2 = await destinationAccount();

    const opPromise = limitedAccount.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals)
    );
    await expect(opPromise).rejects.toThrowError();
  });

  it("should succeed if current time is within period defined by 'greater than' and 'less than' block time rules", async () => {
    const rules = allow.blockTime
      .greaterThan(Date.now() - 10000)
      .and.blockTime.lessThan(Date.now() + 10000).only;
    const limitedAccount = (
      await getAuthedAccountsFromAuthDescriptorRule(rules)
    )[0];

    const account2 = await destinationAccount();

    const opPromise = limitedAccount.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals)
    );
    await expect(opPromise).resolves.not.toThrowError();
  });

  it("should delete expired auth descriptor", async () => {
    const rules = allow.operationCount.lessThan(2).only;

    const [limitedAccount, accountAdmin] =
      await getAuthedAccountsFromAuthDescriptorRule(rules);

    const destAccount = await destinationAccount();

    await limitedAccount.transfer(
      destAccount.id,
      asset.id,
      createAmount(10, asset.decimals)
    );

    // account descriptor used by user2 object has expired.
    // this operation call will delete it.
    // any other operation, which calls require_auth internally
    // would also delete expired auth descriptor.
    await accountAdmin.transfer(
      destAccount.id,
      asset.id,
      createAmount(30, asset.decimals)
    );

    expect((await accountAdmin.getAuthDescriptors()).data.length).toEqual(1);
  });

  it("shouldn't delete non-expired auth descriptor", async () => {
    const rules = allow.operationCount.lessThan(10).only;

    const [limitedAccount, accountAdmin] =
      await getAuthedAccountsFromAuthDescriptorRule(rules);

    const destAccount = await destinationAccount();

    // perform transfer with expiring auth descriptor.
    // auth descriptor didn't expire, because it's only used 1 out of 10 times.
    await limitedAccount.transfer(
      destAccount.id,
      asset.id,
      createAmount(10, asset.decimals)
    );

    // perform transfer using auth descriptor without rules
    await limitedAccount.transfer(
      destAccount.id,
      asset.id,
      createAmount(10, asset.decimals)
    );

    expect((await accountAdmin.getAuthDescriptors()).data.length).toEqual(2);
  });

  it("should delete only expired auth descriptor if multiple expiring descriptors exist", async () => {
    const rules = allow.operationCount.lessOrEqual(1).only;
    const user3 = testUser(allow.operationCount.lessOrEqual(1).only);

    const [limitedAccount, accountAdmin] =
      await getAuthedAccountsFromAuthDescriptorRule(rules);

    const destAccount = await destinationAccount();

    await accountAdmin.addAuthDescriptor(
      user3.authDescriptor,
      user3.signatureProvider
    );

    await limitedAccount.transfer(
      destAccount.id,
      asset.id,
      createAmount(50, asset.decimals)
    );

    // this call will trigger deletion of expired auth descriptor (attached to user2)
    await accountAdmin.transfer(
      destAccount.id,
      asset.id,
      createAmount(100, asset.decimals)
    );

    expect((await accountAdmin.getAuthDescriptors()).data.length).toEqual(2);
  });

  it("should add auth descriptors", async () => {
    const rules = allow.operationCount.lessOrEqual(1).only;
    const user3 = testUser(allow.operationCount.lessOrEqual(1).only);

    const accountAdmin = (
      await getAuthedAccountsFromAuthDescriptorRule(rules)
    )[1];

    await accountAdmin.addAuthDescriptor(
      user3.authDescriptor,
      user3.signatureProvider
    );

    expect((await accountAdmin.getAuthDescriptors()).data.length).toEqual(3);
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

    expect((await session.account.getAuthDescriptors()).data.length).toEqual(3);

    const tx = await session
      .transactionBuilder()
      .add(_deleteAllAuthDescriptorsExclude(session.account.id, ad1.id))
      .build();
    await _connection.client.sendTransaction(tx);

    expect((await session.account.getAuthDescriptors()).data.length).toEqual(1);
  });

  it("should fail when deleting an auth descriptor which is not owned by the account", async () => {
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

    expect((await session.account.getAuthDescriptors()).data.length).toEqual(1);
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

  it("shouldn't be able to create too many rules", async () => {
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

/*
 * How long they take: Total: 211.441s
 * 
 * Not skipping any of them to test if they work.
 * Here we can choose which ones should be skipped
 *
✓ (8220 ms) should succeed when number of called operations is less than or equal to value set by operation count rule
✓ (7999 ms) should fail when number of called operations is greater than value set by operation count rule
✓ (7384 ms) should fail when current time is greater than time defined by 'less than' block time rule
✓ (7838 ms) should succeed when current time is less than time defined by 'less than' block time rule
✓ (7786 ms) should succeed when current block height is less than value defined by 'less than' block height rule
✓ (7808 ms) should fail when current block height is greater than value defined by 'less than' block height rule
✓ (8281 ms) should fail if operation is executed before timestamp defined by 'greater than' block time rule
✓ (8317 ms) should succeed if operation is executed after timestamp defined by 'greater than' block time rule
✓ (8321 ms) should fail if operation is executed before block defined by 'greater than' block height rule
✓ (9791 ms) should succeed if operation is executed after block defined by 'greater than' block height rule
✓ (9780 ms) should be able to create complex rules
✓ (9885 ms) should fail if block heights defined by 'greater than' and 'less than' block height rules are less than current block height
✓ (9855 ms) should fail if block times defined by 'greater than' and 'less than' block time rules are in the past
✓ (9806 ms) should succeed if current time is within period defined by 'greater than' and 'less than' block time rules
✓ (11379 ms) should delete expired auth descriptor
✓ (11407 ms) shouldn't delete non-expired auth descriptor
✓ (13069 ms) should delete only expired auth descriptor if multiple expiring descriptors exist
✓ (8281 ms) should add auth descriptors
✓ (6612 ms) should delete auth descriptors
✓ (4878 ms) should fail when deleting an auth descriptor which is not owned by the account
✓ (4924 ms) should delete auth descriptor
✓ (6584 ms) Should be able to create same rules with different value
✓ (9817 ms) shouldn't be able to create too many rules
✓ (1664 ms) shouldn't be able to create an account with an expiring auth descriptor
 * 
*/
