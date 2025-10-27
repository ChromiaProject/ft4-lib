import {
  AccountBuilder,
  addAuthDescriptorTo,
  adminUser,
  createAccount,
  createTestAuthDescriptor,
  getNewAsset,
  singleSigUser as testUser,
  useChromiaNode,
} from "@ft4-test/util";
import {
  AuthDescriptorRules,
  AuthenticatedAccount,
  AuthFlag,
  createAuthenticatedAccount,
  deleteAllAuthDescriptorsExceptMain,
  lessOrEqual,
  opCount,
} from "@ft4/accounts";
import { addRateLimitPoints } from "@ft4/admin";
import { Asset } from "@ft4/asset";
import {
  createAuthenticator,
  createInMemoryFtKeyStore,
} from "@ft4/authentication";
import {
  Connection,
  createAuthDataService,
  createConnection,
  createSession,
} from "@ft4/ft-session";
import { IClient, newSignatureProvider } from "postchain-client";

let _connection: Connection;
let asset: Asset;
let client: IClient;

function sourceAccount(): Promise<AuthenticatedAccount> {
  return AccountBuilder.account(_connection)
    .withBalance(asset, 200)
    .withPoints(5)
    .build();
}

async function getAuthedAccountsFromAuthDescriptorRule(
  rule: AuthDescriptorRules,
): Promise<
  [limitedAccount: AuthenticatedAccount, accountAdmin: AuthenticatedAccount]
> {
  const user2 = testUser(_connection, rule);
  const accountAdmin = await sourceAccount();

  await accountAdmin.addAuthDescriptor(user2.authDescriptor, user2.keyStore);

  const accounts = await _connection.getAccountsByAuthDescriptorId(
    user2.authDescriptor.id,
  );
  if (accounts.data.length > 1) throw new Error("Found more than one account");

  const keyHandler = createInMemoryFtKeyStore(
    user2.signatureProvider,
  ).createKeyHandler(user2.authDescriptor);
  const authenticator = createAuthenticator(
    accountAdmin.id,
    [keyHandler],
    createAuthDataService(_connection),
  );
  const limitedAccount = createAuthenticatedAccount(_connection, authenticator);

  return [limitedAccount, accountAdmin];
}

describe("Auth Descriptor Rule", () => {
  const getClient = useChromiaNode();

  beforeAll(async () => {
    client = getClient();
    _connection = createConnection(client);
    asset = await getNewAsset(
      _connection.client,
      "auth_descriptor_rules",
      "AUTH_DESCRIPTOR_RULES",
    );
  });

  it("should add auth descriptors", async () => {
    const user3 = testUser(_connection, lessOrEqual(opCount(1)));

    const [, accountAdmin] = await getAuthedAccountsFromAuthDescriptorRule(
      lessOrEqual(opCount(1)),
    );

    await accountAdmin.addAuthDescriptor(user3.authDescriptor, user3.keyStore);

    expect((await accountAdmin.getAuthDescriptors()).length).toEqual(3);
  });

  it("should delete all auth descriptors", async () => {
    const { keyPair: kp1, authDescriptor: ad1 } = createTestAuthDescriptor([
      AuthFlag.Account,
      AuthFlag.Transfer,
    ]);
    const { keyPair: kp2, authDescriptor: ad2 } = createTestAuthDescriptor(
      [AuthFlag.Account],
      lessOrEqual(opCount(1)),
    );
    const { keyPair: kp3, authDescriptor: ad3 } = createTestAuthDescriptor(
      [AuthFlag.Account],
      lessOrEqual(opCount(1)),
    );

    const accountId = await createAccount(_connection.client, ad1);
    addRateLimitPoints(client, adminUser().signatureProvider, accountId, 1);

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
      createAuthenticator(accountId, [keyHandler], authDataService),
    );

    expect((await session.account.getAuthDescriptors()).length).toEqual(3);

    const tx = await session
      .transactionBuilder()
      .add(deleteAllAuthDescriptorsExceptMain())
      .build();
    await _connection.client.sendTransaction(tx);

    expect((await session.account.getAuthDescriptors()).length).toEqual(1);
  });

  it("should fail when deleting an auth descriptor which is not owned by the account", async () => {
    const { keyPair: kp1, authDescriptor: ad1 } = createTestAuthDescriptor([
      AuthFlag.Account,
      AuthFlag.Transfer,
    ]);
    const { authDescriptor: ad2 } = createTestAuthDescriptor([
      AuthFlag.Account,
      AuthFlag.Transfer,
    ]);

    await createAccount(_connection.client, ad1);
    await createAccount(_connection.client, ad2);

    const keyHandler = createInMemoryFtKeyStore(kp1).createKeyHandler(ad1);
    const authDataService = createAuthDataService(_connection);

    const session = createSession(
      _connection,
      createAuthenticator(ad1.id, [keyHandler], authDataService),
    );

    const promise = session.account.deleteAuthDescriptor(ad2.id);
    await expect(promise).rejects.toThrowError();
  });

  it("should delete auth descriptor", async () => {
    const { keyPair: kp1, authDescriptor: ad1 } = createTestAuthDescriptor([
      AuthFlag.Account,
      AuthFlag.Transfer,
    ]);
    const { keyPair: kp2, authDescriptor: ad2 } = createTestAuthDescriptor([
      AuthFlag.Account,
      AuthFlag.Transfer,
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
      createAuthenticator(accountId, [keyHandler], authDataService),
    );
    await session.account.deleteAuthDescriptor(ad2.id);

    expect((await session.account.getAuthDescriptors()).length).toEqual(1);
  });
});
