import { IClient } from "postchain-client";
import { KeyPair } from "../client/lib/cryptoUtils";
import { FlagsType } from "../client/lib/ft4/accounts/auth-descriptor";
import { authDescriptor } from "../client/lib/ft4/accounts/auth-descriptor";
import { createInMemoryFTKeyStore } from "../client/lib/ft4/authentication/ft/key-stores/in-memory";
import { createKeyStoreInteractor } from "../client/lib/ft4/ft-session";
import { ftUserSession } from "../client/lib/ft4/types";
import AccountBuilder from "./util/account-builder";
import { createChromiaClient, getUserSession } from "./util/blockchain-util";
import { newSingleSigUser } from "./util/test-user";

let _ft: ftUserSession;
let client: IClient;

describe("Key store interactor", () => {
  beforeAll(async () => {
    _ft = await getUserSession();
    client = await createChromiaClient();
  });

  it("should return one account if corresponding key is used in one account", async () => {
    const keyPair1 = new KeyPair();
    const keyPair2 = new KeyPair();
    const ft1 = _ft.changeUser(newSingleSigUser(keyPair1));
    const ft2 = _ft.changeUser(newSingleSigUser(keyPair2));
    await AccountBuilder.account(ft1).withPoints(1).build();
    await AccountBuilder.account(ft2).withPoints(1).build();

    const accounts = await createKeyStoreInteractor(
      client,
      createInMemoryFTKeyStore(keyPair1)
    ).getAccounts();

    expect(accounts.length).toEqual(1);
  });

  it("should return two accounts if corresponding key is used in two accounts", async () => {
    const keyPair1 = new KeyPair();
    const keyPair2 = new KeyPair();
    const ft1 = _ft.changeUser(newSingleSigUser(keyPair1));
    const ft2 = _ft.changeUser(newSingleSigUser(keyPair2));
    const account = await AccountBuilder.account(ft1)
      .withPoints(1)
      .buildAuthenticated();
    await AccountBuilder.account(ft2).withPoints(1).build();

    await account.addAuthDescriptor(ft2.user.authDescriptor, keyPair2);

    const accounts = await createKeyStoreInteractor(
      client,
      createInMemoryFTKeyStore(keyPair2)
    ).getAccounts();

    expect(accounts.length).toEqual(2);
  });

  it("should have authenticator with one key handler when there is only one auth descriptor with corresponding key", async () => {
    const keyPair1 = new KeyPair();
    const ft = _ft.changeUser(newSingleSigUser(keyPair1));
    const account = await AccountBuilder.account(ft).withPoints(1).build();

    const { getAccounts, getSession } = createKeyStoreInteractor(
      client,
      createInMemoryFTKeyStore(keyPair1)
    );
    const accounts = await getAccounts();
    expect(accounts.length).toEqual(1);

    const session = await getSession(account.id);
    expect(session.account.authenticator.keyHandlers.length).toEqual(1);
  });

  it("should have authenticator with two key handlers when there are two auth descriptors with corresponding key", async () => {
    const keyPair1 = new KeyPair();
    const keyPair2 = new KeyPair();
    const ft = _ft.changeUser(newSingleSigUser(keyPair1));
    const account = await AccountBuilder.account(ft)
      .withPoints(1)
      .buildAuthenticated();

    const ad1 = authDescriptor.create.singleSig.withArgs(
      ["M"],
      keyPair1.pubKey
    ).andNoRules;
    await account.addAuthDescriptor(ad1, keyPair1);

    const ad2 = authDescriptor.create.singleSig.withArgs(
      [FlagsType.Transfer],
      keyPair2.pubKey
    ).andNoRules;
    await account.addAuthDescriptor(ad2, keyPair2);

    const session = await createKeyStoreInteractor(
      client,
      createInMemoryFTKeyStore(keyPair1)
    ).getSession(account.id);

    expect(session.account.authenticator.keyHandlers.length).toEqual(2);
  });
});
