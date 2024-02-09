import { IClient, newSignatureProvider } from "postchain-client";
import AccountBuilder from "../util/account-builder";
import adminUser from "../util/admin_user";
import testUser from "../util/test-user";
import {
  addAuthDescriptorTo,
  createAccount,
  createTestAuthDescriptor,
} from "../util/util";
import { addRateLimitPoints } from "@ft4/index";
import { lessOrEqual, opCount } from "@ft4/accounts";
import { createAuthenticatedAccount } from "@ft4/accounts/account-op-functions";
import { deleteAllAuthDescriptorsExclude } from "@ft4/accounts/account-operations";
import { AuthDescriptorRules } from "@ft4/accounts/auth-descriptor/types";
import { AuthenticatedAccount } from "@ft4/accounts/types";
import { Asset } from "@ft4/asset/types";
import { createAuthenticator } from "@ft4/authentication";
import { createInMemoryFtKeyStore } from "@ft4/authentication/ft/key-stores/in-memory";
import {
  createAuthDataService,
  createConnection,
  createSession,
} from "@ft4/ft-session";
import { Connection } from "@ft4/types";
import { getNewAsset } from "@ft4/util/blockchain-util";
import { useChromiaNode } from "@ft4/util/chromia-node";

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
  const user2 = testUser(rule);
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
    asset = await getNewAsset(_connection.client);
  });

  it("should add auth descriptors", async () => {
    const user3 = testUser(lessOrEqual(opCount(1)));

    const [, accountAdmin] = await getAuthedAccountsFromAuthDescriptorRule(
      lessOrEqual(opCount(1)),
    );

    await accountAdmin.addAuthDescriptor(user3.authDescriptor, user3.keyStore);

    expect((await accountAdmin.getAuthDescriptors()).data.length).toEqual(3);
  });

  it("should delete all auth descriptors", async () => {
    const { keyPair: kp1, authDescriptor: ad1 } = createTestAuthDescriptor([
      "A",
    ]);
    const { keyPair: kp2, authDescriptor: ad2 } = createTestAuthDescriptor(
      ["A"],
      lessOrEqual(opCount(1)),
    );
    const { keyPair: kp3, authDescriptor: ad3 } = createTestAuthDescriptor(
      ["A"],
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
      createAuthenticator(ad1.id, [keyHandler], authDataService),
    );

    expect((await session.account.getAuthDescriptors()).data.length).toEqual(3);

    const tx = await session
      .transactionBuilder()
      .add(deleteAllAuthDescriptorsExclude(session.account.id, ad1.id))
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
      createAuthenticator(ad1.id, [keyHandler], authDataService),
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
      createAuthenticator(ad1.id, [keyHandler], authDataService),
    );
    await session.account.deleteAuthDescriptor(ad2.id);

    expect((await session.account.getAuthDescriptors()).data.length).toEqual(1);
  });
});
