import testUser from "./util/test-user";
import AccountBuilder from "./util/account-builder";
import adminUser from "./util/admin_user";
import { Connection } from "/ft4/types";
import { Asset } from "/ft4/asset/types";
import { AuthenticatedAccount } from "/ft4/accounts/types";
import { AuthDescriptorRule } from "/ft4/accounts/auth-descriptor/types";
import { getNewAsset, createChromiaClient } from "./util/blockchain-util";
import { allow } from "/ft4/accounts/auth-descriptor/rules";
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
import { deleteAllAuthDescriptorsExclude } from "/ft4/accounts/account-operations";
import { addRateLimitPoints } from "/ft4";

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
  rule: AuthDescriptorRule,
): Promise<
  [limitedAccount: AuthenticatedAccount, accountAdmin: AuthenticatedAccount]
> {
  const user2 = testUser(rule);
  const accountAdmin = await sourceAccount();

  await accountAdmin.addAuthDescriptor(
    user2.authDescriptor,
    user2.signatureProvider,
  );

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
  beforeAll(async () => {
    client = await createChromiaClient();
    _connection = createConnection(client);
    asset = await getNewAsset(_connection.client);
  });

  it("should add auth descriptors", async () => {
    const rules = allow.operationCount.lessOrEqual(1).only;
    const user3 = testUser(allow.operationCount.lessOrEqual(1).only);

    const [, accountAdmin] = await getAuthedAccountsFromAuthDescriptorRule(
      rules,
    );

    await accountAdmin.addAuthDescriptor(
      user3.authDescriptor,
      user3.signatureProvider,
    );

    expect((await accountAdmin.getAuthDescriptors()).data.length).toEqual(3);
  });

  it("should delete all auth descriptors", async () => {
    const { keyPair: kp1, authDescriptor: ad1 } = createTestAuthDescriptor([
      "A",
    ]);
    const { keyPair: kp2, authDescriptor: ad2 } = createTestAuthDescriptor(
      ["A"],
      allow.operationCount.lessOrEqual(1).only,
    );
    const { keyPair: kp3, authDescriptor: ad3 } = createTestAuthDescriptor(
      ["A"],
      allow.operationCount.lessOrEqual(1).only,
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
