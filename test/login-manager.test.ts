import { GtxClient } from "postchain-client/built/src/gtx/interfaces";
import { getNewAsset, getUserSession } from "./util/blockchain-util";
import { KeyPair } from "/cryptoUtils";
import { FlagsType, authDescriptor, createKeyStoreInteractor } from "/ft3";
import { createInMemoryEVMKeyStore } from "/ft3/authentication";
import { ftUserSession } from "/ft3/types";
import { createAccount } from "./util/util";
import { createAccountObject } from "/ft3/account/account-query-functions";
import { createConnection } from "/ft3/ft-session";
import { createAmount } from "/ft3/asset/amount";
import { encryption } from "postchain-client";
import { transferV2 } from "/ft3/account/account-operations";
import { createInMemoryFTKeyStore } from "/ft3/authentication/ft/key-stores/in-memory";
import { createInMemoryLoginKeyStore } from "/ft3/authentication/login-manager/stores/in-memory";

describe("Login manager", () => {
  let client: GtxClient;
  let ft: ftUserSession;

  beforeAll(async () => {
    ft = await getUserSession();
    client = ft.get.gtxClient;
  });

  it("adds disposable auth descriptor to account", async () => {
    const keyPair = new KeyPair();
    const keyStore = createInMemoryEVMKeyStore(keyPair);
    const ad = authDescriptor.create.singleSig.withArgs(
      [FlagsType.Account],
      keyStore.address
    ).andNoRules;
    const accountId = await createAccount(client, ad);
    const account = createAccountObject(createConnection(client), accountId);

    const loginManger = createKeyStoreInteractor(
      client,
      keyStore
    ).getLoginManager();

    const authDescriptorsBeforeLogin = await account.getAuthDescriptors();
    expect(authDescriptorsBeforeLogin.length).toBe(1);

    await loginManger.login({ accountId: account.id });
    const authDescriptorAfterLogin = await account.getAuthDescriptors();
    expect(authDescriptorAfterLogin.length).toBe(2);
  });

  it("signs transaction with disposable key when disposable auth descriptor has required flags", async () => {
    const keyPair = new KeyPair();
    const asset = await getNewAsset(ft, undefined, undefined, 5);
    const keyStore = createInMemoryEVMKeyStore(keyPair);
    const ad = authDescriptor.create.singleSig.withArgs(
      [FlagsType.Account],
      keyStore.address
    ).andNoRules;
    const accountId = await createAccount(client, ad);

    const loginManger = createKeyStoreInteractor(
      client,
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

    expect(transaction.gtx.signers).toEqual(
      disposableAuthHandler.authDescriptor.signers
    );
  });

  it("does not login when account does not have admin auth descriptor that corresponds to used key store", async () => {
    const keyPair1 = new KeyPair();
    const keyStore = createInMemoryEVMKeyStore(keyPair1);
    const ad = authDescriptor.create.singleSig.withArgs(
      [FlagsType.Account],
      keyStore.id
    ).andNoRules;
    const accountId = await createAccount(client, ad);

    const session = await createKeyStoreInteractor(client, keyStore).getSession(
      accountId
    );

    const keyPair2 = new KeyPair();
    const ad2 = authDescriptor.create.singleSig.withArgs(
      ["X"],
      keyPair2.pubKey
    ).andNoRules;

    await session.account.addAuthDescriptor(ad2, keyPair2);

    const keyStoreInteractor = await createKeyStoreInteractor(
      client,
      createInMemoryFTKeyStore(keyPair2)
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
    const keyStore = createInMemoryEVMKeyStore(keyPair1);
    const ad = authDescriptor.create.singleSig.withArgs(
      [FlagsType.Account],
      keyStore.id
    ).andNoRules;
    const accountId = await createAccount(client, ad);
    const keyStoreInteractor = createKeyStoreInteractor(client, keyStore);
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
