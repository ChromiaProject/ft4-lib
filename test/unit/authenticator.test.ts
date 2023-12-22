import { encryption } from "postchain-client";
import { createFakeAuthDataService } from "../util/fake-auth-data-service";
import { createTestAuthDescriptor } from "../util/util";
import {
  AnyAuthDescriptor,
  FlagsType,
  deriveAuthDescriptorId,
} from "@ft4/accounts/auth-descriptor";
import { FtKeyStore, createAuthenticator } from "@ft4/authentication";
import { createFtKeyHandler } from "@ft4/authentication/ft/key-handler";
import { op } from "@ft4/utils";

describe("Authenticator", () => {
  it("uses non-interactive key store if both non-interactive and interactive auth handlers satisfy auth requirements", async () => {
    const { keyPair: keyPair1, authDescriptor: authDescriptor1 } =
      createTestAuthDescriptor([FlagsType.Transfer], null);
    const { keyPair: keyPair2, authDescriptor: authDescriptor2 } =
      createTestAuthDescriptor([FlagsType.Transfer], null);

    const interactiveKeyStore: FtKeyStore = {
      isInteractive: true,
      pubKey: keyPair1.pubKey,
      id: keyPair1.pubKey,
      createKeyHandler: jest
        .fn()
        .mockImplementation((authDescriptor: AnyAuthDescriptor) =>
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
        .mockImplementation((authDescriptor: AnyAuthDescriptor) =>
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

    expect(deriveAuthDescriptorId(authHandler2.authDescriptor)).toEqual(
      deriveAuthDescriptorId(authHandler!.authDescriptor),
    );
  });
});
