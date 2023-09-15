import { encryption } from "postchain-client";
import { createFakeAuthDataService } from "./util/fake-auth-data-service";
import {
  FlagsType,
  createSingleSignatureAuthDescriptorRegistration,
  AnyAuthDescriptorRegistration,
  deriveAccountId,
} from "/ft4/accounts/auth-descriptor";
import { createAuthenticator } from "/ft4/authentication";
import {
  FtKeyStore,
  createFtKeyHandler,
} from "/ft4/authentication/ft/key-handler";
import { op } from "/ft4/utils";

describe("Authenticator", () => {
  it("uses non-interactive key store if both non-interactive and interactive auth handlers satisfy auth requirements", async () => {
    const keyPair1 = encryption.makeKeyPair();
    const keyPair2 = encryption.makeKeyPair();

    const authDescriptor1 = createSingleSignatureAuthDescriptorRegistration(
      {
        flags: [FlagsType.Transfer],
        signer: keyPair1.pubKey,
      },
      null,
    );
    const authDescriptor2 = createSingleSignatureAuthDescriptorRegistration(
      {
        flags: [FlagsType.Transfer],
        signer: keyPair2.pubKey,
      },
      null,
    );

    const interactiveKeyStore: FtKeyStore = {
      isInteractive: true,
      pubKey: keyPair1.pubKey,
      id: keyPair1.pubKey,
      createKeyHandler: jest
        .fn()
        .mockImplementation((authDescriptor: AnyAuthDescriptorRegistration) =>
          createFtKeyHandler(authDescriptor, interactiveKeyStore),
        ),
      sign: jest.fn(),
    };

    const nonInteractiveKeyStore: FtKeyStore = {
      isInteractive: false,
      pubKey: keyPair2.pubKey,
      id: keyPair2.pubKey,
      createKeyHandler: jest
        .fn()
        .mockImplementation((authDescriptor: AnyAuthDescriptorRegistration) =>
          createFtKeyHandler(authDescriptor, nonInteractiveKeyStore),
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
      authDataService,
    );

    const authHandler = await authenticator.getKeyHandlerForOperation(
      op("foo"),
    );

    expect(deriveAccountId(authHandler2.authDescriptorRegistration)).toEqual(
      deriveAccountId(authHandler!.authDescriptorRegistration),
    );
  });
});
