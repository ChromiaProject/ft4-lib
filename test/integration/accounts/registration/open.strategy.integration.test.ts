import {
  EvmKeyStore,
  FtKeyStore,
  LoginConfigOptions,
  LoginKeyStore,
  createInMemoryEvmKeyStore,
  createInMemoryFtKeyStore,
  createInMemoryLoginKeyStore,
} from "@ft4/authentication";
import { Connection, createConnection } from "@ft4/ft-session";
import { registrationStrategy, registerAccount } from "@ft4/registration";
import { useChromiaNode } from "@ft4-test/util";
import {
  KeyPair,
  MERKLE_HASH_VERSIONS,
  encryption,
  gtv,
} from "postchain-client";
import {
  AnyAuthDescriptorRegistration,
  AuthFlag,
  createSingleSigAuthDescriptorRegistration,
} from "@ft4/accounts";

let _connection: Connection;

describe("Test open strategy", () => {
  const getClient = useChromiaNode();

  let keyPair: KeyPair;
  let ftKeyStore: FtKeyStore;
  let evmKeyStore: EvmKeyStore;
  let ftAuthDescriptor: AnyAuthDescriptorRegistration;
  let evmAuthDescriptor: AnyAuthDescriptorRegistration;
  let loginKeyStore: LoginKeyStore;

  beforeAll(async () => {
    const client = getClient();
    _connection = createConnection(client);
  });

  beforeEach(async () => {
    keyPair = encryption.makeKeyPair();
    ftKeyStore = createInMemoryFtKeyStore(keyPair);
    evmKeyStore = createInMemoryEvmKeyStore(keyPair);

    ftAuthDescriptor = createSingleSigAuthDescriptorRegistration(
      [AuthFlag.Account, AuthFlag.Transfer],
      ftKeyStore.id,
    );
    evmAuthDescriptor = createSingleSigAuthDescriptorRegistration(
      [AuthFlag.Account, AuthFlag.Transfer],
      evmKeyStore.id,
    );
    loginKeyStore = createInMemoryLoginKeyStore();
  });

  it("can register account using open account strategy", async () => {
    const { session } = await registerAccount(
      _connection.client,
      ftKeyStore,
      registrationStrategy.open(ftAuthDescriptor),
    );
    expect(session.account.id).toEqual(
      gtv.gtvHash(keyPair.pubKey, MERKLE_HASH_VERSIONS.ONE),
    );
  });

  it("emits events during registration", async () => {
    const builtListener = jest.fn();
    const sentListener = jest.fn();

    await registerAccount(
      _connection.client,
      ftKeyStore,
      registrationStrategy.open(ftAuthDescriptor),
    )
      .on("built", builtListener)
      .on("sent", sentListener);

    expect(builtListener).toHaveBeenCalledTimes(1);
    expect(sentListener).toHaveBeenCalledTimes(1);
  });

  const configs: LoginConfigOptions[] = [
    {
      loginKeyStore: createInMemoryLoginKeyStore(),
      config: { flags: [], rules: null },
    },
    {
      loginKeyStore: createInMemoryLoginKeyStore(),
    },
  ];
  it.each(configs)(
    "can add disposable key with different configuration during account registration",
    async (options) => {
      const { session } = await registerAccount(
        _connection.client,
        ftKeyStore,
        registrationStrategy.open(ftAuthDescriptor, options),
      );

      expect(session.account.id).toEqual(
        gtv.gtvHash(keyPair.pubKey, MERKLE_HASH_VERSIONS.ONE),
      );

      const disposableKeyStore = await options.loginKeyStore!.getKeyStore(
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
    },
  );

  it("removes disposable key on logout", async () => {
    const { session, logout } = await registerAccount(
      _connection.client,
      ftKeyStore,
      registrationStrategy.open(ftAuthDescriptor, {
        loginKeyStore,
      }),
    );
    const disposableKeyStore = await loginKeyStore.getKeyStore(
      session.account.id,
    );
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
    const { session } = await registerAccount(
      _connection.client,
      evmKeyStore,
      registrationStrategy.open(evmAuthDescriptor),
    );

    expect(session.account.id).toEqual(
      gtv.gtvHash(evmKeyStore.address, MERKLE_HASH_VERSIONS.ONE),
    );
  });

  it("can add disposable key to account registered with evm key", async () => {
    const { session } = await registerAccount(
      _connection.client,
      evmKeyStore,
      registrationStrategy.open(evmAuthDescriptor, {
        loginKeyStore,
        config: { flags: [], rules: null },
      }),
    );

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
  });
});
