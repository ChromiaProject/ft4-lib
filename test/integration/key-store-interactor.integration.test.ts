import { newSignatureProvider } from "postchain-client";
import { FlagsType } from "@ft4/accounts/auth-descriptor";
import { createInMemoryFtKeyStore } from "@ft4/authentication/ft/key-stores/in-memory";
import {
  createAuthDataService,
  createConnection,
  createKeyStoreInteractor,
} from "@ft4/ft-session";
import { Connection } from "@ft4/types";
import AccountBuilder from "@ft4/util/account-builder";
import { useChromiaNode } from "@ft4/util/chromia-node";
import { createAuthenticator, createFtKeyHandler } from "@ft4/authentication";
import { createTestAuthDescriptor } from "@ft4/util/util";
import { deleteAuthDescriptor } from "@ft4/accounts/account-operations";

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

    const account1 = await AccountBuilder.account(connection)
      .withSigner(keyPair1)
      .build();
    const account2 = await AccountBuilder.account(connection)
      .withSigner(keyPair2)
      .build();

    await account1.addAuthDescriptor(
      (await account2.getAuthDescriptors()).data[0],
      keyPair2,
    );

    const accounts = await createKeyStoreInteractor(
      connection.client,
      createInMemoryFtKeyStore(keyPair2),
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
    const { keyPair: keyPair1, authDescriptor: ad1 } = createTestAuthDescriptor(
      ["M"],
    );
    const { keyPair: keyPair2, authDescriptor: ad2 } = createTestAuthDescriptor(
      [FlagsType.Transfer],
    );

    const account = await AccountBuilder.account(connection)
      .withSigner(newSignatureProvider(keyPair1))
      .build();

    await account.addAuthDescriptor(ad1, keyPair1);
    await account.addAuthDescriptor(ad2, keyPair2);

    const session = await createKeyStoreInteractor(
      connection.client,
      createInMemoryFtKeyStore(keyPair1),
    ).getSession(account.id);

    expect(session.account.authenticator.keyHandlers.length).toEqual(2);
  });

  it("it picks the backend selected KeyHandler when authenticating", async () => {
    const { keyPair: keyPair1, authDescriptor: ad1 } =
      createTestAuthDescriptor();
    const { keyPair: keyPair2, authDescriptor: ad2 } = createTestAuthDescriptor(
      [FlagsType.Transfer],
    );

    const account = await AccountBuilder.account(connection)
      .withSigner(newSignatureProvider(keyPair1))
      .build();

    await account.addAuthDescriptor(ad2, keyPair2);

    const kh1 = createFtKeyHandler(ad1, createInMemoryFtKeyStore(keyPair1));
    const kh2 = createFtKeyHandler(ad2, createInMemoryFtKeyStore(keyPair2));
    const authenticator = createAuthenticator(
      account.id,
      [kh1, kh2],
      createAuthDataService(connection),
    );
    const selectedKeyHandler = await authenticator.getKeyHandlerForOperation(
      deleteAuthDescriptor(ad2.id),
    );
    expect(selectedKeyHandler).toStrictEqual(kh2);
  });
});
