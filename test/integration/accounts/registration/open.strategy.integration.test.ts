import { registerAccount } from "@ft4/accounts/registration";
import { open } from "@ft4/accounts/registration/strategies/open";
import {
  Connection,
  createConnection,
  createInMemoryEvmKeyStore,
  createInMemoryFtKeyStore,
  createSingleSigAuthDescriptorRegistration,
} from "@ft4/index";
import { useChromiaNode } from "@ft4/util/chromia-node";
import { encryption, gtv } from "postchain-client";
import { createInMemoryLoginKeyStore } from "@ft4/authentication/login/stores/in-memory/index";

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
      _connection,
      keyStore,
      open(authDescriptor),
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
      _connection,
      keyStore,
      open(authDescriptor, {
        loginKeyStore,
        config: { flags: [], rules: null },
      }),
    );

    expect(session.account.id).toEqual(gtv.gtvHash(keyPair.pubKey));

    expect(await loginKeyStore.getKeyStore(session.account.id)).toBeTruthy();
    await logout();
    expect(await loginKeyStore.getKeyStore(session.account.id)).toBeNull();
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
      _connection,
      keyStore,
      open(authDescriptor, {
        loginKeyStore,
      }),
    );

    expect(session.account.id).toEqual(gtv.gtvHash(keyPair.pubKey));

    expect(await loginKeyStore.getKeyStore(session.account.id)).toBeTruthy();
    await logout();
    expect(await loginKeyStore.getKeyStore(session.account.id)).toBeNull();
  });

  it("can register account with evm key store", async () => {
    const keyPair = encryption.makeKeyPair();
    const keyStore = createInMemoryEvmKeyStore(keyPair);

    const authDescriptor = createSingleSigAuthDescriptorRegistration(
      ["A", "T"],
      keyStore.id,
    );

    const { session, logout } = await registerAccount(
      _connection,
      keyStore,
      open(authDescriptor),
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
      _connection,
      keyStore,
      open(authDescriptor, {
        loginKeyStore,
        config: { flags: [], rules: null },
      }),
    );

    expect(session.account.id).toEqual(gtv.gtvHash(keyStore.address));

    expect(await loginKeyStore.getKeyStore(session.account.id)).toBeTruthy();
    await logout();
    expect(await loginKeyStore.getKeyStore(session.account.id)).toBeNull();
  });
});
