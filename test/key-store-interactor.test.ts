import { KeyPair } from "../client/lib/cryptoUtils";
import { createInMemoryFTKeyStore } from "../client/lib/ft3/authentication/ft/key-stores/in-memory";
import { createKeyStoreInteractor } from "../client/lib/ft3/ft-session";
import { ftUserSession } from "../client/lib/ft3/interfaces";
import AccountBuilder from "./util/account-builder";
import { getUserSession } from "./util/blockchain-util";
import { newSingleSigUser } from "./util/test-user";

let _ft: ftUserSession;

describe("Key store interactor", () => {
  beforeAll(async () => {
    _ft = await getUserSession();
  });

  it("should have authenticator with one key handler", async () => {
    const keyPair = new KeyPair();
    const ft = _ft.changeUser(newSingleSigUser(keyPair));
    const account = await AccountBuilder.account(ft).withPoints(1).build();

    const { getAccounts, getSession } = createKeyStoreInteractor(
      ft.get.gtxClient,
      createInMemoryFTKeyStore(keyPair)
    );
    const accounts = await getAccounts();
    expect(accounts.length).toEqual(1);

    const session = await getSession(accounts[0].id);
    expect(session.account.id).toEqual(account.id);
    expect(session.account.authenticator.keyHandlers.length).toEqual(1);
  });
});
