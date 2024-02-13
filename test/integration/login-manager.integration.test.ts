import {
  FlagsType,
  createKeyStoreInteractor,
  minutes,
  ttlLoginRule,
} from "@ft4/index";
import { createInMemoryEvmKeyStore } from "@ft4/authentication";
import { Connection } from "@ft4/types";
import { createAccount } from "../util/util";
import { createAccountObject } from "@ft4/accounts/account-query-functions";
import { createConnection } from "@ft4/ft-session";
import { createAmount } from "@ft4/asset/amount";
import { transfer } from "@ft4/accounts/account-operations";
import { IClient, encryption, gtx } from "postchain-client";
import { createInMemoryFtKeyStore } from "@ft4/authentication/ft/key-stores/in-memory";
import { createInMemoryLoginKeyStore } from "@ft4/authentication/login-manager/stores/in-memory";
import {
  createSingleSigAuthDescriptorRegistration,
  lessOrEqual,
  lessThan,
} from "@ft4/accounts/auth-descriptor";
import { aggregateSigners } from "@ft4/accounts";
import { getNewAsset } from "@ft4/util/blockchain-util";
import { useChromiaNode } from "@ft4/util/chromia-node";
import {
  and,
  blockTime,
  mapLoginConfigRulesToAuthDescriptorRules,
  opCount,
  relativeBlockHeight,
} from "@ft4/authentication/login-manager/rules";

describe("Login manager", () => {
  const getClient = useChromiaNode();

  let client: IClient;
  let connection: Connection;
  const dateNow = Date.now;

  beforeAll(async () => {
    client = getClient();
    connection = createConnection(client);
    Date.now = jest.fn(() => 10000000000000);
  });

  afterAll(() => {
    Date.now = dateNow;
  });

  it("adds disposable auth descriptor to account", async () => {
    const keyPair = encryption.makeKeyPair();
    const keyStore = createInMemoryEvmKeyStore(keyPair);
    const ad = createSingleSigAuthDescriptorRegistration(
      [FlagsType.Account],
      keyStore.address,
      null,
    );
    const accountId = await createAccount(client, ad);
    const account = createAccountObject(connection, accountId);

    const loginManager = createKeyStoreInteractor(
      connection.client,
      keyStore,
    ).getLoginManager();

    const authDescriptorsBeforeLogin = await account.getAuthDescriptors();
    expect(authDescriptorsBeforeLogin.data.length).toBe(1);

    await loginManager.login({ accountId: account.id });
    const authDescriptorAfterLogin = await account.getAuthDescriptors();
    expect(authDescriptorAfterLogin.data.length).toBe(2);
  });

  it("added disposable auth descriptor has no rules by default", async () => {
    const keyPair = encryption.makeKeyPair();
    const keyStore = createInMemoryEvmKeyStore(keyPair);
    const ad = createSingleSigAuthDescriptorRegistration(
      ["A"],
      keyStore.address,
    );
    const accountId = await createAccount(client, ad);
    const account = createAccountObject(connection, accountId);

    const loginManager = createKeyStoreInteractor(
      connection.client,
      keyStore,
    ).getLoginManager();

    await loginManager.login({ accountId: account.id });

    const authDescriptorAfterLogin = await account.getAuthDescriptors();
    expect(authDescriptorAfterLogin.data[1].rules).toEqual(null);
  });

  it("added disposable auth descriptor expires in 30 minutes", async () => {
    const keyPair = encryption.makeKeyPair();
    const keyStore = createInMemoryEvmKeyStore(keyPair);
    const ad = createSingleSigAuthDescriptorRegistration(
      [FlagsType.Account],
      keyStore.address,
    );
    const accountId = await createAccount(client, ad);
    const account = createAccountObject(connection, accountId);

    const loginManager = createKeyStoreInteractor(
      connection.client,
      keyStore,
    ).getLoginManager();

    await loginManager.login({
      accountId: account.id,
      config: { flags: ["T"], rules: ttlLoginRule(minutes(30)) },
    });
    const expectedExpiration = Date.now() + 1800000; // 30 min from now

    const authDescriptorAfterLogin = await account.getAuthDescriptors();
    expect(authDescriptorAfterLogin.data[1].rules).toEqual(
      lessThan(blockTime(expectedExpiration)),
    );
  });

  it("added disposable auth descriptor has correct rules", async () => {
    const keyPair = encryption.makeKeyPair();
    const keyStore = createInMemoryEvmKeyStore(keyPair);
    const ad = createSingleSigAuthDescriptorRegistration(
      [FlagsType.Account],
      keyStore.address,
    );
    const accountId = await createAccount(client, ad);
    const account = createAccountObject(connection, accountId);

    const loginManager = createKeyStoreInteractor(
      connection.client,
      keyStore,
    ).getLoginManager();

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

    await loginManager.login({
      accountId: account.id,
      config: { flags: ["T"], rules },
    });
    const authDescriptorAfterLogin = await account.getAuthDescriptors();
    expect(authDescriptorAfterLogin.data[1].rules).toEqual(expectedRules);
  });

  it("added disposable auth descriptor can have no rules", async () => {
    const keyPair = encryption.makeKeyPair();
    const keyStore = createInMemoryEvmKeyStore(keyPair);
    const ad = createSingleSigAuthDescriptorRegistration(
      [FlagsType.Account],
      keyStore.address,
    );
    const accountId = await createAccount(client, ad);
    const account = createAccountObject(connection, accountId);

    const loginManager = createKeyStoreInteractor(
      connection.client,
      keyStore,
    ).getLoginManager();

    await loginManager.login({
      accountId: account.id,
      config: { flags: ["T"], rules: null },
    });
    const authDescriptorAfterLogin = await account.getAuthDescriptors();
    expect(authDescriptorAfterLogin.data[1].rules).toEqual(null);
  });

  it("signs transaction with disposable key when disposable auth descriptor has required flags", async () => {
    const keyPair = encryption.makeKeyPair();
    const asset = await getNewAsset(client, undefined, undefined, 5);
    const keyStore = createInMemoryEvmKeyStore(keyPair);
    const ad = createSingleSigAuthDescriptorRegistration(
      [FlagsType.Account],
      keyStore.address,
      null,
    );
    const accountId = await createAccount(client, ad);

    const loginManager = createKeyStoreInteractor(
      connection.client,
      keyStore,
    ).getLoginManager();

    const session = await loginManager.login({
      accountId: accountId,
      config: {
        flags: [FlagsType.Transfer],
        rules: null,
      },
    });

    const transaction = await session
      .transactionBuilder()
      .add(transfer(encryption.randomBytes(32), asset.id, createAmount(10)))
      .build();

    const disposableAuthHandler =
      session.account.authenticator.keyHandlers.filter((keyHandler) =>
        keyHandler.authDescriptor.id.compare(keyStore.address),
      )[0];

    expect(gtx.deserialize(transaction).signers).toEqual(
      aggregateSigners(disposableAuthHandler.authDescriptor),
    );
  });

  it("does not login when account does not have admin auth descriptor that corresponds to used key store", async () => {
    const keyPair1 = encryption.makeKeyPair();
    const keyStore = createInMemoryEvmKeyStore(keyPair1);
    const ad = createSingleSigAuthDescriptorRegistration(
      [FlagsType.Account],
      keyStore.id,
      null,
    );
    const accountId = await createAccount(client, ad);

    const session = await createKeyStoreInteractor(
      connection.client,
      keyStore,
    ).getSession(accountId);

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
    const loginManager = keyStoreInteractor.getLoginManager();

    expect(loginManager.login({ accountId })).rejects.toThrow(
      `Admin auth descriptor does not exist for provided key store <${keyPair2.pubKey.toString(
        "hex",
      )}>`,
    );
  });

  it("uses key pair stored in login key store", async () => {
    const keyPair1 = encryption.makeKeyPair();
    const keyStore = createInMemoryEvmKeyStore(keyPair1);
    const ad = createSingleSigAuthDescriptorRegistration(
      [FlagsType.Account],
      keyStore.id,
      null,
    );
    const accountId = await createAccount(client, ad);
    const keyStoreInteractor = createKeyStoreInteractor(
      connection.client,
      keyStore,
    );
    const session = await keyStoreInteractor.getSession(accountId);

    const loginKeyStore = createInMemoryLoginKeyStore();
    const keyStore2 = await loginKeyStore.generateKey(accountId);
    const ad2 = createSingleSigAuthDescriptorRegistration(
      ["X"],
      keyStore2.id,
      null,
    );
    await session.account.addAuthDescriptor(ad2, keyStore2);

    const loginManager = keyStoreInteractor.getLoginManager(loginKeyStore);
    const session2 = await loginManager.login({
      accountId,
      config: { flags: ["X"], rules: null },
    });

    const keyStoreIds = session2.account.authenticator.keyHandlers.map(
      (keyHandler) => keyHandler.keyStore.id,
    );
    expect(keyStoreIds).toMatchObject([keyStore2.id, keyStore.id]);
  });
});
