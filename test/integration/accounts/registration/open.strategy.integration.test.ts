import {
  createInMemoryEvmKeyStore,
  createInMemoryFtKeyStore,
  createInMemoryLoginKeyStore,
} from "@ft4/authentication";
import { Connection, createConnection } from "@ft4/ft-session";
import { registrationStrategy, registerAccount } from "@ft4/registration";
import { useChromiaNode } from "@ft4-test/util";
import { encryption, gtv } from "postchain-client";
import { createSingleSigAuthDescriptorRegistration } from "@ft4/accounts";

let _connection: Connection;

describe("Test open strategy", () => {
  const getClient = useChromiaNode();

  beforeAll(async () => {
    const client = getClient();
    _connection = createConnection(client);
  });

  it("can register account", async () => {
    const keyPair = encryption.makeKeyPair();
    const keyStore = createInMemoryFtKeyStore(keyPair);

    const authDescriptor = createSingleSigAuthDescriptorRegistration(
      ["A", "T"],
      keyStore.id,
    );

    const { session, logout } = await registerAccount(
      _connection.client,
      keyStore,
      registrationStrategy.open(authDescriptor),
    );

    expect(session.account.id).toEqual(gtv.gtvHash(keyPair.pubKey));

    await logout(); // should be a no-op
  });

  it("can add disposable key during account registration", async () => {
    const keyPair = encryption.makeKeyPair();
    const keyStore = createInMemoryFtKeyStore(keyPair);

    const authDescriptor = createSingleSigAuthDescriptorRegistration(
      ["A", "T"],
      keyStore.id,
    );

    const loginKeyStore = createInMemoryLoginKeyStore();

    const { session, logout } = await registerAccount(
      _connection.client,
      keyStore,
      registrationStrategy.open(authDescriptor, {
        loginKeyStore,
        config: { flags: [], rules: null },
      }),
    );

    expect(session.account.id).toEqual(gtv.gtvHash(keyPair.pubKey));

    const disposableKeyStore = await loginKeyStore.getKeyStore(
      session.account.id,
    );
    expect(disposableKeyStore).toBeTruthy();
    expect(
      (
        await session.account.getAuthDescriptorsBySigner(
          disposableKeyStore!.pubKey,
        )
      ).length,
    ).toEqual(1);

    await logout();
    expect(await loginKeyStore.getKeyStore(session.account.id)).toBeNull();
    expect(
      (
        await session.account.getAuthDescriptorsBySigner(
          disposableKeyStore!.pubKey,
        )
      ).length,
    ).toEqual(0);
  });

  it("can add disposable key with default login config during account registration", async () => {
    const keyPair = encryption.makeKeyPair();
    const keyStore = createInMemoryFtKeyStore(keyPair);

    const authDescriptor = createSingleSigAuthDescriptorRegistration(
      ["A", "T"],
      keyStore.id,
    );

    const loginKeyStore = createInMemoryLoginKeyStore();

    const { session, logout } = await registerAccount(
      _connection.client,
      keyStore,
      registrationStrategy.open(authDescriptor, {
        loginKeyStore,
      }),
    );

    expect(session.account.id).toEqual(gtv.gtvHash(keyPair.pubKey));

    const disposableKeyStore = await loginKeyStore.getKeyStore(
      session.account.id,
    );
    expect(disposableKeyStore).toBeTruthy();
    expect(
      (
        await session.account.getAuthDescriptorsBySigner(
          disposableKeyStore!.pubKey,
        )
      ).length,
    ).toEqual(1);

    await logout();
    expect(await loginKeyStore.getKeyStore(session.account.id)).toBeNull();
    expect(
      (
        await session.account.getAuthDescriptorsBySigner(
          disposableKeyStore!.pubKey,
        )
      ).length,
    ).toEqual(0);
  });

  it("can register account with evm key store", async () => {
    const keyPair = encryption.makeKeyPair();
    const keyStore = createInMemoryEvmKeyStore(keyPair);

    const authDescriptor = createSingleSigAuthDescriptorRegistration(
      ["A", "T"],
      keyStore.id,
    );

    const { session, logout } = await registerAccount(
      _connection.client,
      keyStore,
      registrationStrategy.open(authDescriptor),
    );

    expect(session.account.id).toEqual(gtv.gtvHash(keyStore.address));

    await logout(); // should be a no-op
  });

  it("can register account with evm key store and add disposable key", async () => {
    const keyPair = encryption.makeKeyPair();
    const keyStore = createInMemoryEvmKeyStore(keyPair);

    const authDescriptor = createSingleSigAuthDescriptorRegistration(
      ["A", "T"],
      keyStore.id,
    );

    const loginKeyStore = createInMemoryLoginKeyStore();

    const { session, logout } = await registerAccount(
      _connection.client,
      keyStore,
      registrationStrategy.open(authDescriptor, {
        loginKeyStore,
        config: { flags: [], rules: null },
      }),
    );

    expect(session.account.id).toEqual(gtv.gtvHash(keyStore.address));

    const disposableKeyStore = await loginKeyStore.getKeyStore(
      session.account.id,
    );
    expect(disposableKeyStore).toBeTruthy();
    expect(
      (
        await session.account.getAuthDescriptorsBySigner(
          disposableKeyStore!.pubKey,
        )
      ).length,
    ).toEqual(1);

    await logout();
    expect(await loginKeyStore.getKeyStore(session.account.id)).toBeNull();
    expect(
      (
        await session.account.getAuthDescriptorsBySigner(
          disposableKeyStore!.pubKey,
        )
      ).length,
    ).toEqual(0);
  });
});
