import testUser from "./util/test-user";
import AccountBuilder from "./util/account-builder";
import { Connection } from "/ft4/types";
import { Asset } from "/ft4/asset/types";
import { AuthenticatedAccount } from "/ft4/accounts/types";
import {
  AuthDescriptorRule,
  RuleOperator,
  RuleVariable,
} from "/ft4/accounts/auth-descriptor/types";
import { getNewAsset, createChromiaClient } from "./util/blockchain-util";
import { createAmount } from "/ft4/asset/amount";
import { IClient, newSignatureProvider } from "postchain-client";
import { createAuthenticatedAccount } from "/ft4/accounts/account-op-functions";
import {
  createAuthDataService,
  createConnection,
  createSession,
} from "/ft4/ft-session";
import {
  addAuthDescriptorTo,
  createAccount,
  createTestAuthDescriptorRegistration,
} from "./util/util";
import { createAuthenticator } from "/ft4/authentication";
import { createInMemoryFtKeyStore } from "/ft4/authentication/ft/key-stores/in-memory";
import { deleteAllAuthDescriptorsExclude } from "/ft4/accounts/account-operations";
import { registerAccount } from "/ft4/admin/admin-op-functions";
import adminUser from "./util/admin_user";
import {
  createCompositeRule,
  createSimpleRule,
  createSingleSignatureAuthDescriptorRegistration,
  deriveAccountId,
} from "/ft4/accounts";

let _connection: Connection;
let asset: Asset;
let client: IClient;

function sourceAccount(): Promise<AuthenticatedAccount> {
  return AccountBuilder.account(_connection)
    .withBalance(asset, 200)
    .withPoints(5)
    .build();
}

function destinationAccount(): Promise<AuthenticatedAccount> {
  return AccountBuilder.account(_connection).build();
}

async function getAuthedAccountsFromAuthDescriptorRule(
  rule: AuthDescriptorRule,
): Promise<
  [limitedAccount: AuthenticatedAccount, accountAdmin: AuthenticatedAccount]
> {
  const user2 = testUser(rule);
  const accountAdmin = await sourceAccount();

  await accountAdmin.addAuthDescriptor(
    user2.authDescriptorRegistration,
    user2.signatureProvider,
  );

  const accounts = await _connection.getAccountsByAuthDescriptorId(
    deriveAccountId(user2.authDescriptorRegistration),
  );
  if (accounts.data.length > 1) throw new Error("Found more than one account");

  const keyHandler = createInMemoryFtKeyStore(
    user2.signatureProvider,
  ).createKeyHandler(user2.authDescriptorRegistration);
  const authenticator = createAuthenticator(
    accountAdmin.id,
    [keyHandler],
    createAuthDataService(_connection),
  );
  const limitedAccount = createAuthenticatedAccount(_connection, authenticator);

  return [limitedAccount, accountAdmin];
}

describe("Auth Descriptor Rule", () => {
  beforeAll(async () => {
    client = await createChromiaClient();
    _connection = createConnection(client);
    asset = await getNewAsset(_connection.client);
  });

  it("should succeed when number of called operations is less than or equal to value set by operation count rule", async () => {
    const [limitedAccount] = await getAuthedAccountsFromAuthDescriptorRule(
      createSimpleRule(RuleVariable.OpCount, RuleOperator.LessOrEqual, 2),
    );

    const account2 = await destinationAccount();

    const op1Promise = limitedAccount.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals),
    );
    await expect(op1Promise).resolves.not.toThrowError();

    const op2Promise = limitedAccount.transfer(
      account2.id,
      asset.id,
      createAmount(20, asset.decimals),
    );
    await expect(op2Promise).resolves.not.toThrowError();
  });

  it("should fail when number of called operations is greater than value set by operation count rule", async () => {
    const [limitedAccount] = await getAuthedAccountsFromAuthDescriptorRule(
      createSimpleRule(RuleVariable.OpCount, RuleOperator.LessThan, 2),
    );

    const account2 = await destinationAccount();

    const op1Promise = limitedAccount.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals),
    );
    await expect(op1Promise).resolves.not.toThrowError();

    const op2Promise = limitedAccount.transfer(
      account2.id,
      asset.id,
      createAmount(20, asset.decimals),
    );
    await expect(op2Promise).rejects.toThrowError();
  });

  it("should fail when current time is greater than time defined by 'less than' block time rule", async () => {
    const [limitedAccount] = await getAuthedAccountsFromAuthDescriptorRule(
      createSimpleRule(
        RuleVariable.BlockTime,
        RuleOperator.LessThan,
        Date.now() - 10000,
      ),
    );

    const account2 = await destinationAccount();

    const opPromise = limitedAccount.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals),
    );
    await expect(opPromise).rejects.toThrowError();
  });

  it("should succeed when current time is less than time defined by 'less than' block time rule", async () => {
    const [limitedAccount] = await getAuthedAccountsFromAuthDescriptorRule(
      createSimpleRule(
        RuleVariable.BlockTime,
        RuleOperator.LessThan,
        Date.now() + 10000,
      ),
    );

    const account2 = await destinationAccount();

    const opPromise = limitedAccount.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals),
    );
    await expect(opPromise).resolves.not.toThrowError();
  });

  it("should succeed when current block height is less than value defined by 'less than' block height rule", async () => {
    const [limitedAccount] = await getAuthedAccountsFromAuthDescriptorRule(
      createSimpleRule(RuleVariable.BlockHeight, RuleOperator.LessThan, 10000),
    );

    const account2 = await destinationAccount();

    const opPromise = limitedAccount.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals),
    );
    await expect(opPromise).resolves.not.toThrowError();
  });

  it("should fail when current block height is greater than value defined by 'less than' block height rule", async () => {
    const [limitedAccount] = await getAuthedAccountsFromAuthDescriptorRule(
      createSimpleRule(RuleVariable.BlockHeight, RuleOperator.LessThan, 1),
    );

    const account2 = await destinationAccount();

    const opPromise = limitedAccount.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals),
    );
    await expect(opPromise).rejects.toThrowError();
  });

  it("should fail if operation is executed before timestamp defined by 'greater than' block time rule", async () => {
    const [limitedAccount] = await getAuthedAccountsFromAuthDescriptorRule(
      createSimpleRule(
        RuleVariable.BlockTime,
        RuleOperator.GreaterThan,
        Date.now() + 10000,
      ),
    );

    const account2 = await destinationAccount();

    const opPromise = limitedAccount.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals),
    );
    await expect(opPromise).rejects.toThrowError();
  });

  it("should succeed if operation is executed after timestamp defined by 'greater than' block time rule", async () => {
    const [limitedAccount] = await getAuthedAccountsFromAuthDescriptorRule(
      createSimpleRule(
        RuleVariable.BlockTime,
        RuleOperator.GreaterThan,
        Date.now() - 10000,
      ),
    );

    const account2 = await destinationAccount();

    const opPromise = limitedAccount.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals),
    );
    await expect(opPromise).resolves.not.toThrowError();
  });

  it("should fail if operation is executed before block defined by 'greater than' block height rule", async () => {
    const [limitedAccount] = await getAuthedAccountsFromAuthDescriptorRule(
      createSimpleRule(
        RuleVariable.BlockHeight,
        RuleOperator.GreaterThan,
        10000,
      ),
    );

    const account2 = await destinationAccount();

    const opPromise = limitedAccount.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals),
    );
    await expect(opPromise).rejects.toThrowError();
  });

  it("should succeed if operation is executed after block defined by 'greater than' block height rule", async () => {
    const [limitedAccount] = await getAuthedAccountsFromAuthDescriptorRule(
      createSimpleRule(RuleVariable.BlockHeight, RuleOperator.GreaterThan, 1),
    );

    const account2 = await destinationAccount();

    const opPromise = limitedAccount.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals),
    );
    await expect(opPromise).resolves.not.toThrowError();
  });

  it("should be able to create complex rules", async () => {
    const [limitedAccount] = await getAuthedAccountsFromAuthDescriptorRule(
      createCompositeRule(
        createSimpleRule(RuleVariable.BlockHeight, RuleOperator.GreaterThan, 1),
        createSimpleRule(
          RuleVariable.BlockHeight,
          RuleOperator.LessThan,
          10000,
        ),
      ),
    );

    const account2 = await destinationAccount();

    const opPromise = limitedAccount.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals),
    );
    await expect(opPromise).resolves.not.toThrowError();
  });

  it("should fail if block heights defined by 'greater than' and 'less than' block height rules are less than current block height", async () => {
    const [limitedAccount] = await getAuthedAccountsFromAuthDescriptorRule(
      createCompositeRule(
        createSimpleRule(RuleVariable.BlockHeight, RuleOperator.GreaterThan, 1),
        createSimpleRule(RuleVariable.BlockHeight, RuleOperator.LessThan, 10),
      ),
    );

    const account2 = await destinationAccount();

    const opPromise = limitedAccount.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals),
    );
    await expect(opPromise).rejects.toThrowError();
  });

  it("should fail if block times defined by 'greater than' and 'less than' block time rules are in the past", async () => {
    const rules = createCompositeRule(
      createSimpleRule(
        RuleVariable.BlockTime,
        RuleOperator.GreaterThan,
        Date.now() - 20000,
      ),
      createSimpleRule(
        RuleVariable.BlockTime,
        RuleOperator.LessThan,
        Date.now() - 10000,
      ),
    );
    const [limitedAccount] = await getAuthedAccountsFromAuthDescriptorRule(
      rules,
    );

    const account2 = await destinationAccount();

    const opPromise = limitedAccount.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals),
    );
    await expect(opPromise).rejects.toThrowError();
  });

  it("should succeed if current time is within period defined by 'greater than' and 'less than' block time rules", async () => {
    const rules = createCompositeRule(
      createSimpleRule(
        RuleVariable.BlockTime,
        RuleOperator.GreaterThan,
        Date.now() - 10000,
      ),
      createSimpleRule(
        RuleVariable.BlockTime,
        RuleOperator.LessThan,
        Date.now() + 10000,
      ),
    );
    const [limitedAccount] = await getAuthedAccountsFromAuthDescriptorRule(
      rules,
    );

    const account2 = await destinationAccount();

    const opPromise = limitedAccount.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals),
    );
    await expect(opPromise).resolves.not.toThrowError();
  });

  it("should delete expired auth descriptor", async () => {
    const rules = createSimpleRule(
      RuleVariable.OpCount,
      RuleOperator.LessThan,
      2,
    );

    const [limitedAccount, accountAdmin] =
      await getAuthedAccountsFromAuthDescriptorRule(rules);

    const destAccount = await destinationAccount();

    await limitedAccount.transfer(
      destAccount.id,
      asset.id,
      createAmount(10, asset.decimals),
    );

    // account descriptor used by user2 object has expired.
    // this operation call will delete it.
    // any other operation, which calls require_auth internally
    // would also delete expired auth descriptor.
    await accountAdmin.transfer(
      destAccount.id,
      asset.id,
      createAmount(30, asset.decimals),
    );

    expect((await accountAdmin.getAuthDescriptors()).data.length).toEqual(1);
  });

  it("shouldn't delete non-expired auth descriptor", async () => {
    const rules = createSimpleRule(
      RuleVariable.OpCount,
      RuleOperator.LessThan,
      10,
    );

    const [limitedAccount, accountAdmin] =
      await getAuthedAccountsFromAuthDescriptorRule(rules);

    const destAccount = await destinationAccount();

    // perform transfer with expiring auth descriptor.
    // auth descriptor didn't expire, because it's only used 1 out of 10 times.
    await limitedAccount.transfer(
      destAccount.id,
      asset.id,
      createAmount(10, asset.decimals),
    );

    // perform transfer using auth descriptor without rules
    await limitedAccount.transfer(
      destAccount.id,
      asset.id,
      createAmount(10, asset.decimals),
    );

    expect((await accountAdmin.getAuthDescriptors()).data.length).toEqual(2);
  });

  it("should delete only expired auth descriptor if multiple expiring descriptors exist", async () => {
    const rules = createSimpleRule(
      RuleVariable.OpCount,
      RuleOperator.LessOrEqual,
      1,
    );
    const user3 = testUser(
      createSimpleRule(RuleVariable.OpCount, RuleOperator.LessOrEqual, 1),
    );

    const [limitedAccount, accountAdmin] =
      await getAuthedAccountsFromAuthDescriptorRule(rules);

    const destAccount = await destinationAccount();

    await accountAdmin.addAuthDescriptor(
      user3.authDescriptorRegistration,
      user3.signatureProvider,
    );

    await limitedAccount.transfer(
      destAccount.id,
      asset.id,
      createAmount(50, asset.decimals),
    );

    // this call will trigger deletion of expired auth descriptor (attached to user2)
    await accountAdmin.transfer(
      destAccount.id,
      asset.id,
      createAmount(100, asset.decimals),
    );

    expect((await accountAdmin.getAuthDescriptors()).data.length).toEqual(2);
  });

  it("should add auth descriptors", async () => {
    const rules = createSimpleRule(
      RuleVariable.OpCount,
      RuleOperator.LessOrEqual,
      1,
    );
    const user3 = testUser(
      createSimpleRule(RuleVariable.OpCount, RuleOperator.LessOrEqual, 1),
    );

    const [, accountAdmin] = await getAuthedAccountsFromAuthDescriptorRule(
      rules,
    );

    await accountAdmin.addAuthDescriptor(
      user3.authDescriptorRegistration,
      user3.signatureProvider,
    );

    expect((await accountAdmin.getAuthDescriptors()).data.length).toEqual(3);
  });

  it("should delete auth descriptors", async () => {
    const { keyPair: kp1, authDescriptorRegistration: ad1 } =
      createTestAuthDescriptorRegistration(["A"]);
    const { keyPair: kp2, authDescriptorRegistration: ad2 } =
      createTestAuthDescriptorRegistration(
        ["A"],
        createSimpleRule(RuleVariable.OpCount, RuleOperator.LessOrEqual, 1),
      );
    const { keyPair: kp3, authDescriptorRegistration: ad3 } =
      createTestAuthDescriptorRegistration(
        ["A"],
        createSimpleRule(RuleVariable.OpCount, RuleOperator.LessOrEqual, 1),
      );

    const accountId = await createAccount(_connection.client, ad1);

    const user1 = {
      signatureProvider: newSignatureProvider(kp1),
      authDescriptorRegistration: ad1,
    };
    const user2 = {
      signatureProvider: newSignatureProvider(kp2),
      authDescriptorRegistration: ad2,
    };
    const user3 = {
      signatureProvider: newSignatureProvider(kp3),
      authDescriptorRegistration: ad3,
    };

    await addAuthDescriptorTo(_connection.client, accountId, user1, user2);
    await addAuthDescriptorTo(_connection.client, accountId, user1, user3);

    const keyHandler = createInMemoryFtKeyStore(kp1).createKeyHandler(ad1);

    const authDataService = createAuthDataService(_connection);

    const session = createSession(
      _connection,
      createAuthenticator(deriveAccountId(ad1), [keyHandler], authDataService),
    );

    expect((await session.account.getAuthDescriptors()).data.length).toEqual(3);

    const tx = await session
      .transactionBuilder()
      .add(
        deleteAllAuthDescriptorsExclude(
          session.account.id,
          deriveAccountId(ad1),
        ),
      )
      .build();
    await _connection.client.sendTransaction(tx);

    expect((await session.account.getAuthDescriptors()).data.length).toEqual(1);
  });

  it("should fail when deleting an auth descriptor which is not owned by the account", async () => {
    const { keyPair: kp1, authDescriptorRegistration: ad1 } =
      createTestAuthDescriptorRegistration(["A"]);
    const { authDescriptorRegistration: ad2 } =
      createTestAuthDescriptorRegistration(["A"]);

    await createAccount(_connection.client, ad1);
    await createAccount(_connection.client, ad2);

    const keyHandler = createInMemoryFtKeyStore(kp1).createKeyHandler(ad1);
    const authDataService = createAuthDataService(_connection);

    const session = createSession(
      _connection,
      createAuthenticator(deriveAccountId(ad1), [keyHandler], authDataService),
    );

    const promise = session.account.deleteAuthDescriptor(deriveAccountId(ad2));
    await expect(promise).rejects.toThrowError();
  });

  it("should delete auth descriptor", async () => {
    const { keyPair: kp1, authDescriptorRegistration: ad1 } =
      createTestAuthDescriptorRegistration(["A"]);
    const { keyPair: kp2, authDescriptorRegistration: ad2 } =
      createTestAuthDescriptorRegistration(["A"]);

    const accountId = await createAccount(_connection.client, ad1);

    const user1 = {
      signatureProvider: newSignatureProvider(kp1),
      authDescriptorRegistration: ad1,
    };
    const user2 = {
      signatureProvider: newSignatureProvider(kp2),
      authDescriptorRegistration: ad2,
    };

    await addAuthDescriptorTo(_connection.client, accountId, user1, user2);

    const keyHandler = createInMemoryFtKeyStore(kp1).createKeyHandler(ad1);
    const authDataService = createAuthDataService(_connection);

    const session = createSession(
      _connection,
      createAuthenticator(deriveAccountId(ad1), [keyHandler], authDataService),
    );
    await session.account.deleteAuthDescriptor(deriveAccountId(ad2));

    expect((await session.account.getAuthDescriptors()).data.length).toEqual(1);
  });

  it("Should be able to create same rules with different value", async () => {
    const rules = createCompositeRule(
      createSimpleRule(RuleVariable.BlockHeight, RuleOperator.GreaterThan, 1),
      createCompositeRule(
        createSimpleRule(
          RuleVariable.BlockHeight,
          RuleOperator.GreaterThan,
          10000,
        ),
        createSimpleRule(
          RuleVariable.BlockHeight,
          RuleOperator.GreaterOrEqual,
          122222999,
        ),
      ),
    );

    const promise = getAuthedAccountsFromAuthDescriptorRule(rules);

    await expect(promise).resolves.toBeInstanceOf(Array);
  });

  it("shouldn't be able to create too many rules", async () => {
    let rules = createCompositeRule(
      createSimpleRule(RuleVariable.BlockHeight, RuleOperator.GreaterThan, 1),
      createCompositeRule(
        createSimpleRule(
          RuleVariable.BlockHeight,
          RuleOperator.GreaterThan,
          10000,
        ),
        createSimpleRule(
          RuleVariable.BlockHeight,
          RuleOperator.GreaterOrEqual,
          122222999,
        ),
      ),
    );
    for (let i = 0; i < 400; i++) {
      rules = createCompositeRule(
        rules,
        createSimpleRule(
          RuleVariable.BlockHeight,
          RuleOperator.GreaterOrEqual,
          1,
        ),
      );
    }

    const user = testUser(rules);
    const account = await sourceAccount();

    await expect(
      account.addAuthDescriptor(
        user.authDescriptorRegistration,
        user.signatureProvider,
      ),
    ).rejects.toThrowError();
  });

  it("shouldn't be able to create an account with a limited auth descriptor", async () => {
    const rules = createSimpleRule(
      RuleVariable.OpCount,
      RuleOperator.LessOrEqual,
      2,
    );
    const sp = newSignatureProvider();

    const ad = createSingleSignatureAuthDescriptorRegistration(
      {
        flags: ["A", "T"],
        signer: sp.pubKey,
      },
      rules,
    );

    const promise = registerAccount(
      _connection.client,
      adminUser().signatureProvider,
      ad,
    );

    await expect(promise).rejects.toThrowError();
  });
});
