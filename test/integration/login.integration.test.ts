import { createAccount, getNewAsset, useChromiaNode } from "@ft4-test/util";
import {
  Account,
  AuthFlag,
  aggregateSigners,
  and,
  blockTime,
  createAccountObject,
  createSingleSigAuthDescriptorRegistration,
  lessOrEqual,
  lessThan,
  opCount,
  transfer,
} from "@ft4/accounts";
import { createAmount } from "@ft4/asset";
import {
  EvmKeyStore,
  createInMemoryEvmKeyStore,
  createInMemoryFtKeyStore,
  createInMemoryLoginKeyStore,
  mapLoginConfigRulesToAuthDescriptorRules,
  minutes,
  relativeBlockHeight,
  ttlLoginRule,
} from "@ft4/authentication";
import {
  Connection,
  createConnection,
  createKeyStoreInteractor,
} from "@ft4/ft-session";
import { IClient, KeyPair, encryption, gtx } from "postchain-client";

describe("Login", () => {
  const getClient = useChromiaNode();

  let client: IClient;
  let connection: Connection;
  const dateNow = Date.now;

  beforeAll(async () => {
    client = getClient();
    connection = createConnection(client);
    Date.now = jest.fn(() => 10000000000000);
  });

  let keyPair: KeyPair;
  let evmKeyStore: EvmKeyStore;
  let account: Account;
  beforeEach(async () => {
    keyPair = encryption.makeKeyPair();
    evmKeyStore = createInMemoryEvmKeyStore(keyPair);
    const ad = createSingleSigAuthDescriptorRegistration(
      [AuthFlag.Account, AuthFlag.Transfer],
      evmKeyStore.address,
    );
    const accountId = await createAccount(client, ad);
    account = createAccountObject(connection, accountId);
  });

  afterAll(() => {
    Date.now = dateNow;
  });

  it("adds disposable auth descriptor to account", async () => {
    const authDescriptorsBeforeLogin = await account.getAuthDescriptors();
    expect(authDescriptorsBeforeLogin.length).toBe(1);

    await createKeyStoreInteractor(connection.client, evmKeyStore).login({
      accountId: account.id,
    });

    const authDescriptorAfterLogin = await account.getAuthDescriptors();
    expect(authDescriptorAfterLogin.length).toBe(2);
  });

  it("added disposable auth descriptor has no rules by default", async () => {
    await createKeyStoreInteractor(connection.client, evmKeyStore).login({
      accountId: account.id,
    });

    const authDescriptorAfterLogin = await account.getAuthDescriptors();
    expect(authDescriptorAfterLogin[1].rules).toEqual(null);
  });

  it("added disposable auth descriptor expires in 30 minutes", async () => {
    await createKeyStoreInteractor(connection.client, evmKeyStore).login({
      accountId: account.id,
      config: { flags: [AuthFlag.Transfer], rules: ttlLoginRule(minutes(30)) },
    });
    const expectedExpiration = Date.now() + 1800000; // 30 min from now

    const authDescriptorAfterLogin = await account.getAuthDescriptors();
    expect(authDescriptorAfterLogin[1].rules).toEqual(
      lessThan(blockTime(expectedExpiration)),
    );
  });

  it("added disposable auth descriptor has correct rules", async () => {
    const rules = and(
      lessThan(relativeBlockHeight(2)),
      lessOrEqual(opCount(3)),
    );
    let blockHeight: number;
    const getBlockHeight = async () => {
      if (!blockHeight) {
        blockHeight = await connection.getBlockHeight();
      }
      return blockHeight;
    };

    const expectedRules = await mapLoginConfigRulesToAuthDescriptorRules(
      rules,
      getBlockHeight,
    );

    await createKeyStoreInteractor(connection.client, evmKeyStore).login({
      accountId: account.id,
      config: { flags: [AuthFlag.Transfer], rules },
    });
    const authDescriptorAfterLogin = await account.getAuthDescriptors();
    expect(authDescriptorAfterLogin[1].rules).toEqual(expectedRules);
  });

  it("added disposable auth descriptor can have no rules", async () => {
    await createKeyStoreInteractor(connection.client, evmKeyStore).login({
      accountId: account.id,
      config: { flags: [AuthFlag.Transfer], rules: null },
    });
    const authDescriptorAfterLogin = await account.getAuthDescriptors();
    expect(authDescriptorAfterLogin[1].rules).toEqual(null);
  });

  it("signs transaction with disposable key when disposable auth descriptor has required flags", async () => {
    const asset = await getNewAsset(
      client,
      "login_manager",
      "LOGIN_MANAGER",
      5,
    );
    const { session } = await createKeyStoreInteractor(
      connection.client,
      evmKeyStore,
    ).login({
      accountId: account.id,
      config: {
        flags: [AuthFlag.Transfer],
        rules: null,
      },
    });

    const transaction = await session
      .transactionBuilder()
      .add(transfer(encryption.randomBytes(32), asset.id, createAmount(10)))
      .build();

    const disposableAuthHandler =
      session.account.authenticator.keyHandlers.filter(
        (keyHandler) =>
          !keyHandler.authDescriptor.id.equals(evmKeyStore.address),
      )[0];

    expect(gtx.deserialize(transaction).signers).toEqual(
      aggregateSigners(disposableAuthHandler.authDescriptor),
    );
  });

  it("does not login when account does not have admin auth descriptor that corresponds to used key store", async () => {
    const session = await createKeyStoreInteractor(
      connection.client,
      evmKeyStore,
    ).getSession(account.id);

    const keyPair2 = encryption.makeKeyPair();
    const keyStore2 = createInMemoryFtKeyStore(keyPair2);
    const ad2 = createSingleSigAuthDescriptorRegistration(
      ["X"],
      keyPair2.pubKey,
      null,
    );
    await session.account.addAuthDescriptor(ad2, keyStore2);

    const keyStoreInteractor = createKeyStoreInteractor(
      connection.client,
      keyStore2,
    );

    expect(keyStoreInteractor.login({ accountId: account.id })).rejects.toThrow(
      `Admin auth descriptor does not exist for provided key store <${keyPair2.pubKey.toString(
        "hex",
      )}>`,
    );
  });

  it("uses key pair stored in login key store", async () => {
    const keyStoreInteractor = createKeyStoreInteractor(
      connection.client,
      evmKeyStore,
    );
    const session1 = await keyStoreInteractor.getSession(account.id);

    const loginKeyStore = createInMemoryLoginKeyStore();
    const keyStore2 = await loginKeyStore.generateKey(account.id);
    const ad2 = createSingleSigAuthDescriptorRegistration(
      ["X"],
      keyStore2.id,
      null,
    );
    await session1.account.addAuthDescriptor(ad2, keyStore2);

    const { session } = await keyStoreInteractor.login({
      accountId: account.id,
      config: { flags: ["X"], rules: null },
      loginKeyStore,
    });

    expect(
      (await session.account.getAuthDescriptorsBySigner(keyStore2.pubKey))
        .length,
    ).toEqual(1);

    const keyStoreIds = session.account.authenticator.keyHandlers.map(
      (keyHandler) => keyHandler.keyStore.id,
    );
    expect(keyStoreIds).toMatchObject([keyStore2.id, evmKeyStore.id]);
    expect(
      (await loginKeyStore.getKeyStore(session.account.id))!.pubKey,
    ).toMatchObject(keyStore2.pubKey);
  });

  it("removes keypair upon logout", async () => {
    const keyStoreInteractor = createKeyStoreInteractor(
      connection.client,
      evmKeyStore,
    );
    const session1 = await keyStoreInteractor.getSession(account.id);

    const loginKeyStore = createInMemoryLoginKeyStore();
    const keyStore2 = await loginKeyStore.generateKey(account.id);
    const ad2 = createSingleSigAuthDescriptorRegistration(
      ["X"],
      keyStore2.id,
      null,
    );
    await session1.account.addAuthDescriptor(ad2, keyStore2);

    const { session, logout } = await keyStoreInteractor.login({
      accountId: account.id,
      config: { flags: ["X"], rules: null },
      loginKeyStore,
    });

    await logout();
    expect(await loginKeyStore.getKeyStore(session.account.id)).toBeNull();

    expect(
      (await session.account.getAuthDescriptorsBySigner(keyStore2.pubKey))
        .length,
    ).toEqual(0);
  });
});
