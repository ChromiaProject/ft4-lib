import { createChromiaClient, getNewAsset } from "./util/blockchain-util";
import {
  FlagsType,
  authDescriptor,
  createKeyStoreInteractor,
  minutes,
} from "/ft4";
import { createInMemoryEvmKeyStore } from "/ft4/authentication";
import { Connection } from "/ft4/types";
import { createAccount } from "./util/util";
import { createAccountObject } from "/ft4/accounts/account-query-functions";
import { createConnection } from "/ft4/ft-session";
import { createAmount } from "/ft4/asset/amount";
import { transfer } from "/ft4/accounts/account-operations";
import { IClient, encryption, gtx } from "postchain-client";
import { createInMemoryFtKeyStore } from "/ft4/authentication/ft/key-stores/in-memory";
import { createInMemoryLoginKeyStore } from "/ft4/authentication/login-manager/stores/in-memory";
import { allow } from "/ft4/accounts/auth-descriptor/rules";

Date.now = jest.fn(() => 0);

describe("Login manager", () => {
  let client: IClient;
  let connection: Connection;

  beforeAll(async () => {
    client = await createChromiaClient();
    connection = createConnection(client);
  });

  it("adds disposable auth descriptor to account", async () => {
    const keyPair = encryption.makeKeyPair();
    const keyStore = createInMemoryEvmKeyStore(keyPair);
    const ad = authDescriptor.create.singleSig.withArgs(
      [FlagsType.Account],
      keyStore.address,
    ).andNoRules;
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
    const ad = authDescriptor.create.singleSig.withArgs(
      [FlagsType.Account],
      keyStore.address,
    ).andNoRules;
    const accountId = await createAccount(client, ad);
    const account = createAccountObject(connection, accountId);

    const loginManager = createKeyStoreInteractor(
      connection.client,
      keyStore,
    ).getLoginManager();

    await loginManager.login({ accountId: account.id });

    const authDescriptorAfterLogin = await account.getAuthDescriptors();
    expect(authDescriptorAfterLogin.data[1].rule).toEqual(null);
  });

  it("added disposable auth descriptor expires in 30 minutes", async () => {
    const keyPair = encryption.makeKeyPair();
    const keyStore = createInMemoryEvmKeyStore(keyPair);
    const ad = authDescriptor.create.singleSig.withArgs(
      [FlagsType.Account],
      keyStore.address,
    ).andNoRules;
    const accountId = await createAccount(client, ad);
    const account = createAccountObject(connection, accountId);

    const loginManager = createKeyStoreInteractor(
      connection.client,
      keyStore,
    ).getLoginManager();

    await loginManager.login({
      accountId: account.id,
      config: { flags: ["T"], ttl: minutes(30) },
    });
    const expectedExpiration = Date.now() + 1800000; // 30 min from now

    const authDescriptorAfterLogin = await account.getAuthDescriptors();
    expect(authDescriptorAfterLogin.data[1].rule).toEqual(
      allow.blockTime.lessThan(expectedExpiration).only,
    );
  });

  it("added disposable auth descriptor has correct rules", async () => {
    const keyPair = encryption.makeKeyPair();
    const keyStore = createInMemoryEvmKeyStore(keyPair);
    const ad = authDescriptor.create.singleSig.withArgs(
      [FlagsType.Account],
      keyStore.address,
    ).andNoRules;
    const accountId = await createAccount(client, ad);
    const account = createAccountObject(connection, accountId);

    const loginManager = createKeyStoreInteractor(
      connection.client,
      keyStore,
    ).getLoginManager();

    const rules = allow.blockHeight
      .lessThan(2)
      .and.operationCount.lessOrEqual(3).only;
    await loginManager.login({
      accountId: account.id,
      config: { flags: ["T"], rules },
    });
    const authDescriptorAfterLogin = await account.getAuthDescriptors();
    expect(authDescriptorAfterLogin.data[1].rule).toEqual(rules);
  });

  it("added disposable auth descriptor can have no rules", async () => {
    const keyPair = encryption.makeKeyPair();
    const keyStore = createInMemoryEvmKeyStore(keyPair);
    const ad = authDescriptor.create.singleSig.withArgs(
      [FlagsType.Account],
      keyStore.address,
    ).andNoRules;
    const accountId = await createAccount(client, ad);
    const account = createAccountObject(connection, accountId);

    const loginManager = createKeyStoreInteractor(
      connection.client,
      keyStore,
    ).getLoginManager();

    await loginManager.login({
      accountId: account.id,
      config: { flags: ["T"] },
    });
    const authDescriptorAfterLogin = await account.getAuthDescriptors();
    expect(authDescriptorAfterLogin.data[1].rule).toEqual(null);
  });

  it("signs transaction with disposable key when disposable auth descriptor has required flags", async () => {
    const keyPair = encryption.makeKeyPair();
    const asset = await getNewAsset(client, undefined, undefined, 5);
    const keyStore = createInMemoryEvmKeyStore(keyPair);
    const ad = authDescriptor.create.singleSig.withArgs(
      [FlagsType.Account],
      keyStore.address,
    ).andNoRules;
    const accountId = await createAccount(client, ad);

    const loginManager = createKeyStoreInteractor(
      connection.client,
      keyStore,
    ).getLoginManager();

    const session = await loginManager.login({
      accountId: accountId,
      config: {
        flags: [FlagsType.Transfer],
      },
    });

    const transaction = await session
      .transactionBuilder()
      .add(transfer(encryption.randomBytes(32), asset.id, createAmount(10)))
      .build();

    const disposableAuthHandler =
      session.account.authenticator.keyHandlers.filter(
        (keyHandler) => keyHandler.authDescriptor.id !== keyStore.address,
      )[0];

    expect(gtx.deserialize(transaction).signers).toEqual(
      disposableAuthHandler.authDescriptor.signers,
    );
  });

  it("does not login when account does not have admin auth descriptor that corresponds to used key store", async () => {
    const keyPair1 = encryption.makeKeyPair();
    const keyStore = createInMemoryEvmKeyStore(keyPair1);
    const ad = authDescriptor.create.singleSig.withArgs(
      [FlagsType.Account],
      keyStore.id,
    ).andNoRules;
    const accountId = await createAccount(client, ad);

    const session = await createKeyStoreInteractor(
      connection.client,
      keyStore,
    ).getSession(accountId);

    const keyPair2 = encryption.makeKeyPair();
    const ad2 = authDescriptor.create.singleSig.withArgs(
      ["X"],
      keyPair2.pubKey,
    ).andNoRules;

    await session.account.addAuthDescriptor(ad2, keyPair2);

    const keyStoreInteractor = createKeyStoreInteractor(
      connection.client,
      createInMemoryFtKeyStore(keyPair2),
    );
    const loginManager = keyStoreInteractor.getLoginManager();

    expect(loginManager.login({ accountId })).rejects.toThrowError(
      `Admin auth descriptor does not exist for provided key store <${keyPair2.pubKey.toString(
        "hex",
      )}>`,
    );
  });

  it("uses key pair stored in login key store", async () => {
    const keyPair1 = encryption.makeKeyPair();
    const keyStore = createInMemoryEvmKeyStore(keyPair1);
    const ad = authDescriptor.create.singleSig.withArgs(
      [FlagsType.Account],
      keyStore.id,
    ).andNoRules;
    const accountId = await createAccount(client, ad);
    const keyStoreInteractor = createKeyStoreInteractor(
      connection.client,
      keyStore,
    );
    const session = await keyStoreInteractor.getSession(accountId);

    const loginKeyStore = createInMemoryLoginKeyStore();
    const keyPair2 = await loginKeyStore.createKeyPair(accountId);
    const ad2 = authDescriptor.create.singleSig.withArgs(
      ["X"],
      keyPair2.pubKey,
    ).andNoRules;
    await session.account.addAuthDescriptor(ad2, keyPair2);

    const loginManager = keyStoreInteractor.getLoginManager(loginKeyStore);
    const session2 = await loginManager.login({ accountId });

    const keyStoreIds = session2.account.authenticator.keyHandlers.map(
      (keyHandler) => keyHandler.keyStore.id,
    );
    expect(keyStoreIds).toMatchObject([keyPair2.pubKey, keyStore.id]);
  });
});
