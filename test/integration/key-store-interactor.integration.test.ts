import {
  AccountBuilder,
  createTestAuthDescriptor,
  useChromiaNode,
} from "@ft4-test/util";
import {
  AuthFlag,
  blockTime,
  createSingleSigAuthDescriptorRegistration,
  deleteAuthDescriptor,
  deriveAuthDescriptorId,
  greaterThan,
  lessThan,
  opCount,
} from "@ft4/accounts";
import {
  createAuthenticator,
  createFtKeyHandler,
  createInMemoryFtKeyStore,
  nonce,
} from "@ft4/authentication";
import {
  Connection,
  createAuthDataService,
  createConnection,
  createKeyStoreInteractor,
} from "@ft4/ft-session";
import { AuthorizationError } from "@ft4/transaction-builder";
import { nop, op } from "@ft4/utils";
import { newSignatureProvider } from "postchain-client";

let connection: Connection;

describe("Key store interactor", () => {
  const getClient = useChromiaNode();

  beforeAll(async () => {
    const client = getClient();
    connection = createConnection(client);
  });

  it("should return one account if corresponding key is used in one account", async () => {
    const keyPair1 = newSignatureProvider();
    const keyPair2 = newSignatureProvider();

    await AccountBuilder.account(connection).withSigner(keyPair1).build();
    await AccountBuilder.account(connection).withSigner(keyPair2).build();

    const accounts = await createKeyStoreInteractor(
      connection.client,
      createInMemoryFtKeyStore(keyPair1),
    ).getAccounts();

    expect(accounts.length).toEqual(1);
  });

  it("should return two accounts if corresponding key is used in two accounts", async () => {
    const keyPair1 = newSignatureProvider();
    const keyPair2 = newSignatureProvider();
    const keyStore2 = createInMemoryFtKeyStore(keyPair2);

    const account1 = await AccountBuilder.account(connection)
      .withSigner(keyPair1)
      .build();
    const account2 = await AccountBuilder.account(connection)
      .withSigner(keyPair2)
      .build();

    await account1.addAuthDescriptor(
      (await account2.getAuthDescriptors())[0],
      keyStore2,
    );

    const accounts = await createKeyStoreInteractor(
      connection.client,
      keyStore2,
    ).getAccounts();

    expect(accounts.length).toEqual(2);
  });

  it("should have authenticator with one key handler when there is only one auth descriptor with corresponding key", async () => {
    const keyPair1 = newSignatureProvider();

    const account = await AccountBuilder.account(connection)
      .withSigner(keyPair1)
      .build();

    const { getAccounts, getSession } = createKeyStoreInteractor(
      connection.client,
      createInMemoryFtKeyStore(keyPair1),
    );
    const accounts = await getAccounts();
    expect(accounts.length).toEqual(1);

    const session = await getSession(account.id);
    expect(session.account.authenticator.keyHandlers.length).toEqual(1);
  });

  it("should have authenticator with two key handlers when there are two auth descriptors with corresponding key", async () => {
    const {
      keyStore: keyStore1,
      keyPair: keyPair1,
      authDescriptor: ad1,
    } = createTestAuthDescriptor(["M"]);
    const { keyStore: keyStore2, authDescriptor: ad2 } =
      createTestAuthDescriptor([AuthFlag.Transfer]);

    const account = await AccountBuilder.account(connection)
      .withSigner(newSignatureProvider(keyPair1))
      .build();

    await account.addAuthDescriptor(ad1, keyStore1);
    await account.addAuthDescriptor(ad2, keyStore2);

    const session = await createKeyStoreInteractor(
      connection.client,
      createInMemoryFtKeyStore(keyPair1),
    ).getSession(account.id);

    expect(session.account.authenticator.keyHandlers.length).toEqual(2);
  });

  it("should authenticate with the correct auth descriptor", async () => {
    const emptyAuthenticatedOp = op("test_perform_large_transfer", 10, "text");

    const keyPair1 = newSignatureProvider();
    const keyPair2 = newSignatureProvider();

    const account = await AccountBuilder.account(connection)
      .withSigner(keyPair1)
      .withPoints(5)
      .build();

    const ad2 = createSingleSigAuthDescriptorRegistration(
      [AuthFlag.Account],
      keyPair2.pubKey,
      lessThan(opCount(2)),
    );
    await account.addAuthDescriptor(ad2, createInMemoryFtKeyStore(keyPair2));

    const ad2Session = await createKeyStoreInteractor(
      connection.client,
      createInMemoryFtKeyStore(keyPair2),
    ).getSession(account.id);

    const ad3 = createSingleSigAuthDescriptorRegistration(
      [AuthFlag.Account],
      keyPair2.pubKey,
      greaterThan(blockTime(Date.now() + 10000)),
    );
    await account.addAuthDescriptor(ad3, createInMemoryFtKeyStore(keyPair2));

    const ad4 = createSingleSigAuthDescriptorRegistration(
      [AuthFlag.Account],
      keyPair2.pubKey,
      greaterThan(blockTime(Date.now())),
    );
    await account.addAuthDescriptor(ad4, createInMemoryFtKeyStore(keyPair2));

    const session = await createKeyStoreInteractor(
      connection.client,
      createInMemoryFtKeyStore(keyPair2),
    ).getSession(account.id);

    expect(ad2Session.account.authenticator.keyHandlers.length).toEqual(1);
    expect(session.account.authenticator.keyHandlers.length).toEqual(3);

    // make ad2 expire
    await ad2Session
      .transactionBuilder()
      .add(emptyAuthenticatedOp)
      .add(nop())
      .buildAndSend();

    await expect(
      session
        .transactionBuilder()
        .add(emptyAuthenticatedOp)
        .add(nop())
        .buildAndSend(),
    ).resolves.not.toThrow();

    await expect(
      session.client.query(nonce(account.id, deriveAuthDescriptorId(ad4))),
    ).resolves.toBe(1);
  });

  it("should not authenticate if no auth descriptor is valid", async () => {
    const emptyAuthenticatedOp = op("test_perform_large_transfer", 10, "text");

    const keyPair1 = newSignatureProvider();
    const keyPair2 = newSignatureProvider();

    const account = await AccountBuilder.account(connection)
      .withSigner(keyPair1)
      .withPoints(4)
      .build();

    const ad2 = createSingleSigAuthDescriptorRegistration(
      [AuthFlag.Account],
      keyPair2.pubKey,
      lessThan(opCount(2)),
    );
    await account.addAuthDescriptor(ad2, createInMemoryFtKeyStore(keyPair2));

    const ad2Session = await createKeyStoreInteractor(
      connection.client,
      createInMemoryFtKeyStore(keyPair2),
    ).getSession(account.id);

    const ad3 = createSingleSigAuthDescriptorRegistration(
      [AuthFlag.Account],
      keyPair2.pubKey,
      greaterThan(blockTime(Date.now() + 10000)),
    );
    await account.addAuthDescriptor(ad3, createInMemoryFtKeyStore(keyPair2));

    const session = await createKeyStoreInteractor(
      connection.client,
      createInMemoryFtKeyStore(keyPair2),
    ).getSession(account.id);

    expect(ad2Session.account.authenticator.keyHandlers.length).toEqual(1);
    expect(session.account.authenticator.keyHandlers.length).toEqual(2);

    // make ad2 expire
    await ad2Session
      .transactionBuilder()
      .add(emptyAuthenticatedOp)
      .add(nop())
      .buildAndSend();

    await expect(
      session
        .transactionBuilder()
        .add(emptyAuthenticatedOp)
        .add(nop())
        .buildAndSend(),
    ).rejects.toThrow(AuthorizationError);
  });

  it("it picks the backend selected KeyHandler when authenticating", async () => {
    const {
      keyStore: keyStore1,
      keyPair: keyPair1,
      authDescriptor: ad1,
    } = createTestAuthDescriptor();
    const { keyStore: keyStore2, authDescriptor: ad2 } =
      createTestAuthDescriptor([AuthFlag.Transfer]);

    const account = await AccountBuilder.account(connection)
      .withSigner(newSignatureProvider(keyPair1))
      .build();

    await account.addAuthDescriptor(ad2, keyStore2);

    const kh1 = createFtKeyHandler(ad1, keyStore1);
    const kh2 = createFtKeyHandler(ad2, keyStore2);
    const authenticator = createAuthenticator(
      account.id,
      [kh1, kh2],
      createAuthDataService(connection),
    );
    const selectedKeyHandler = await authenticator.getKeyHandlerForOperation(
      deleteAuthDescriptor(ad2.id),
      {},
    );
    expect(selectedKeyHandler).toStrictEqual(kh2);
  });
});
