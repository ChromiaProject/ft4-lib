import { encryption } from "postchain-client";
import { KeyPair } from "/cryptoUtils";
import { AuthDescriptor, authDescriptor } from "/ft4";
import { createAuthenticator } from "/ft4/authentication";
import {
  FtKeyStore,
  createFtKeyHandler,
} from "/ft4/authentication/ft/key-handler";
import { createFakeAuthDataService } from "./util/fake-auth-data-service";
import { _op as op } from "/ft4/utils";

describe("Authenticator", () => {
  it("uses non-interactive key store if both non-interactive and interactive auth handlers satisfy auth requirements", async () => {
    const keyPair1 = new KeyPair();
    const keyPair2 = new KeyPair();

    const authDescriptor1 = authDescriptor.create.singleSig.withArgs(
      ["T"],
      keyPair1.pubKey
    ).andNoRules;
    const authDescriptor2 = authDescriptor.create.singleSig.withArgs(
      ["T"],
      keyPair2.pubKey
    ).andNoRules;

    const interactiveKeyStore: FtKeyStore = {
      isInteractive: true,
      pubKey: keyPair1.pubKey,
      id: keyPair1.pubKey,
      createKeyHandler: jest
        .fn()
        .mockImplementation((authDescriptor: AuthDescriptor) =>
          createFtKeyHandler(authDescriptor, interactiveKeyStore)
        ),
      sign: jest.fn(),
    };

    const nonInteractiveKeyStore: FtKeyStore = {
      isInteractive: false,
      pubKey: keyPair2.pubKey,
      id: keyPair2.pubKey,
      createKeyHandler: jest
        .fn()
        .mockImplementation((authDescriptor: AuthDescriptor) =>
          createFtKeyHandler(authDescriptor, nonInteractiveKeyStore)
        ),
      sign: jest.fn(),
    };

    const accountId = encryption.randomBytes(32);
    const authHandler1 = interactiveKeyStore.createKeyHandler(authDescriptor1);
    const authHandler2 =
      nonInteractiveKeyStore.createKeyHandler(authDescriptor2);
    const authDataService = createFakeAuthDataService({
      foo: {
        flags: ["T"],
        message: "",
      },
    });
    const authenticator = createAuthenticator(
      accountId,
      [authHandler1, authHandler2],
      authDataService
    );

    const authHandler = await authenticator.getKeyHandlerForOperation(
      op("foo")
    );

    console.log(authHandler1.authDescriptor.id.toString("hex"));
    console.log(authHandler2.authDescriptor.id.toString("hex"));
    expect(authHandler2.authDescriptor.id).toEqual(
      authHandler.authDescriptor.id
    );
  });
});
