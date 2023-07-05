import { GtxClient } from "postchain-client/built/src/gtx/interfaces";
import {
  createChromiaClient,
  getNewAsset,
  getUserSession,
} from "./util/blockchain-util";
import { KeyPair } from "/cryptoUtils";
import { FlagsType, authDescriptor, createKeyStoreInteractor } from "/ft4";
import { createInMemoryEvmKeyStore } from "/ft4/authentication";
import { Connection, ftUserSession } from "/ft4/types";
import { createAccount } from "./util/util";
import { createAccountObject } from "/ft4/accounts/account-query-functions";
import { createConnection } from "/ft4/ft-session";
import { createAmount } from "/ft4/asset/amount";
import { IClient, encryption, gtx } from "postchain-client";
import { transferV2 } from "/ft4/accounts/account-operations";
import { createInMemoryFtKeyStore } from "/ft4/authentication/ft/key-stores/in-memory";
import { createInMemoryLoginKeyStore } from "/ft4/authentication/login-manager/stores/in-memory";

describe("Login manager", () => {
  let gtxClient: GtxClient;
  let client: IClient;
  let ft: ftUserSession;
  let connection: Connection;

  beforeAll(async () => {
    ft = await getUserSession();
    gtxClient = ft.get.gtxClient;
    client = await createChromiaClient();
    connection = createConnection(client);
  });

  it("adds disposable auth descriptor to account", async () => {
    const keyPair = new KeyPair();
    const keyStore = createInMemoryEvmKeyStore(keyPair);
    const ad = authDescriptor.create.singleSig.withArgs(
      [FlagsType.Account],
      keyStore.address
    ).andNoRules;
    const accountId = await createAccount(gtxClient, ad);
    const account = createAccountObject(connection, accountId);

    const loginManger = createKeyStoreInteractor(
      connection.client,
      keyStore
    ).getLoginManager();

    const authDescriptorsBeforeLogin = await account.getAuthDescriptors();
    expect(authDescriptorsBeforeLogin.data.length).toBe(1);

    await loginManger.login({ accountId: account.id });
    const authDescriptorAfterLogin = await account.getAuthDescriptors();
    expect(authDescriptorAfterLogin.data.length).toBe(2);
  });

  it("signs transaction with disposable key when disposable auth descriptor has required flags", async () => {
    const keyPair = new KeyPair();
    const asset = await getNewAsset(client, undefined, undefined, 5);
    const keyStore = createInMemoryEvmKeyStore(keyPair);
    const ad = authDescriptor.create.singleSig.withArgs(
      [FlagsType.Account],
      keyStore.address
    ).andNoRules;
    const accountId = await createAccount(gtxClient, ad);

    const loginManger = createKeyStoreInteractor(
      connection.client,
      keyStore
    ).getLoginManager();

    const session = await loginManger.login({
      accountId: accountId,
      config: {
        flags: [FlagsType.Transfer],
      },
    });

    const transaction = await session
      .transactionBuilder()
      .add(transferV2(encryption.randomBytes(32), asset.id, createAmount(10)))
      .build();

    const disposableAuthHandler =
      session.account.authenticator.keyHandlers.filter(
        (keyHandler) => keyHandler.authDescriptor.id !== keyStore.address
      )[0];

    expect(gtx.deserialize(transaction).signers).toEqual(
      disposableAuthHandler.authDescriptor.signers
    );
  });

  it("does not login when account does not have admin auth descriptor that corresponds to used key store", async () => {
    const keyPair1 = new KeyPair();
    const keyStore = createInMemoryEvmKeyStore(keyPair1);
    const ad = authDescriptor.create.singleSig.withArgs(
      [FlagsType.Account],
      keyStore.id
    ).andNoRules;
    const accountId = await createAccount(gtxClient, ad);

    const session = await createKeyStoreInteractor(
      connection.client,
      keyStore
    ).getSession(accountId);

    const keyPair2 = new KeyPair();
    const ad2 = authDescriptor.create.singleSig.withArgs(
      ["X"],
      keyPair2.pubKey
    ).andNoRules;

    await session.account.addAuthDescriptor(ad2, keyPair2);

    const keyStoreInteractor = await createKeyStoreInteractor(
      connection.client,
      createInMemoryFtKeyStore(keyPair2)
    );
    const loginManger = keyStoreInteractor.getLoginManager();

    expect(loginManger.login({ accountId })).rejects.toThrowError(
      `Admin auth descriptor does not exist for provided key store <${keyPair2.pubKey.toString(
        "hex"
      )}>`
    );
  });

  it("uses key pair stored in login key store", async () => {
    const keyPair1 = new KeyPair();
    const keyStore = createInMemoryEvmKeyStore(keyPair1);
    const ad = authDescriptor.create.singleSig.withArgs(
      [FlagsType.Account],
      keyStore.id
    ).andNoRules;
    const accountId = await createAccount(gtxClient, ad);
    const keyStoreInteractor = createKeyStoreInteractor(
      connection.client,
      keyStore
    );
    const session = await keyStoreInteractor.getSession(accountId);

    const loginKeyStore = createInMemoryLoginKeyStore();
    const keyPair2 = await loginKeyStore.createKeyPair(accountId);
    const ad2 = authDescriptor.create.singleSig.withArgs(
      ["X"],
      keyPair2.pubKey
    ).andNoRules;
    await session.account.addAuthDescriptor(ad2, keyPair2);

    const loginManger = keyStoreInteractor.getLoginManager(loginKeyStore);
    const session2 = await loginManger.login({ accountId });

    const keyStoreIds = session2.account.authenticator.keyHandlers.map(
      (keyHandler) => keyHandler.keyStore.id
    );
    expect(keyStoreIds).toMatchObject([keyPair2.pubKey, keyStore.id]);
  });
});
