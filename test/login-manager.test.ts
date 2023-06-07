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
      ["A"],
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
      flags: [FlagsType.Transfer],
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
});
