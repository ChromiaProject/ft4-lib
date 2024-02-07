import { encryption } from "postchain-client";
import { createFakeAuthDataService } from "../util/fake-auth-data-service";
import { createTestAuthDescriptor } from "../util/util";
import { AnyAuthDescriptor, FlagsType } from "@ft4/accounts/auth-descriptor";
import {
  FtKeyStore,
  createAuthenticator,
  createEvmKeyHandler,
  createInMemoryEvmKeyStore,
  createInMemoryFtKeyStore,
} from "@ft4/authentication";
import { createFtKeyHandler } from "@ft4/authentication/ft/key-handler";
import { op } from "@ft4/utils";
import { Connection } from "@ft4/types";
import { createAuthDataService, createConnection } from "@ft4/ft-session";
import { createStubClient } from "postchain-client";

describe("Authenticator", () => {
  let connection: Connection;

  beforeAll(async () => {
    connection = createConnection(await createStubClient());
  });

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

    expect(authHandler2.authDescriptor.id).toEqual(
      authHandler!.authDescriptor.id,
    );
  });

  describe("getAllowedAuthHandler", () => {
    it("downloads all auth handlers", () => {
      connection = {
        ...connection,
        query: jest.fn().mockReturnValueOnce([
          {
            name: "foo",
            flags: ["T"],
            dynamic: false,
          },
        ]),
      };

      const { keyPair: kp1, authDescriptor: ad1 } = createTestAuthDescriptor([
        "A",
      ]);
      const { keyPair: kp2, authDescriptor: ad2 } = createTestAuthDescriptor([
        "T",
      ]);

      const keyHandlers = [
        createFtKeyHandler(ad1, createInMemoryFtKeyStore(kp1)),
        createFtKeyHandler(ad2, createInMemoryFtKeyStore(kp2)),
      ];

      const service = createAuthDataService(connection);
      const authenticator = createAuthenticator(
        Buffer.alloc(0),
        keyHandlers,
        service,
      );

      authenticator.getKeyHandlerForOperation(op("foo"));
      expect(connection.query).toHaveBeenCalledTimes(1);
    });

    it("returns null if no matching auth handler", async () => {
      connection = {
        ...connection,
        query: jest.fn().mockReturnValueOnce([
          {
            name: "foo",
            flags: ["T"],
            dynamic: false,
          },
        ]),
      };

      const { keyPair: kp1, authDescriptor: ad1 } = createTestAuthDescriptor([
        "A",
      ]);
      const { keyPair: kp2, authDescriptor: ad2 } = createTestAuthDescriptor([
        "T",
      ]);

      const keyHandlers = [
        createFtKeyHandler(ad1, createInMemoryFtKeyStore(kp1)),
        createFtKeyHandler(ad2, createInMemoryFtKeyStore(kp2)),
      ];

      const service = createAuthDataService(connection);
      const authenticator = createAuthenticator(
        Buffer.alloc(0),
        keyHandlers,
        service,
      );
      const selectedHandler = await authenticator.getKeyHandlerForOperation(
        op("does not exist"),
      );
      expect(selectedHandler).toStrictEqual(null);
    });

    it("returns key handler selected by backend", async () => {
      const { keyPair: kp1, authDescriptor: ad1 } = createTestAuthDescriptor([
        "A",
      ]);
      const { keyPair: kp2, authDescriptor: ad2 } = createTestAuthDescriptor([
        "T",
      ]);

      const keyHandlers = [
        createFtKeyHandler(ad1, createInMemoryFtKeyStore(kp1)),
        createFtKeyHandler(ad2, createInMemoryFtKeyStore(kp2)),
      ];

      connection = {
        ...connection,
        query: jest
          .fn()
          .mockReturnValueOnce([
            {
              name: "foo",
              flags: ["T"],
              dynamic: false,
            },
          ])
          .mockReturnValueOnce(keyHandlers[1].authDescriptor.id),
      };

      const service = createAuthDataService(connection);
      const authenticator = createAuthenticator(
        Buffer.alloc(0),
        keyHandlers,
        service,
      );
      const selectedHandler = await authenticator.getKeyHandlerForOperation(
        op("foo"),
      );
      expect(selectedHandler).toStrictEqual(keyHandlers[1]);
    });

    it("only submits auth descriptors with matching flags", async () => {
      const { keyPair: kp1, authDescriptor: ad1 } = createTestAuthDescriptor([
        "A",
      ]);
      const { keyPair: kp2, authDescriptor: ad2 } = createTestAuthDescriptor([
        "T",
      ]);

      const keyHandlers = [
        createFtKeyHandler(ad1, createInMemoryFtKeyStore(kp1)),
        createFtKeyHandler(ad2, createInMemoryFtKeyStore(kp2)),
      ];

      connection = {
        ...connection,
        query: jest
          .fn()
          .mockReturnValueOnce([
            {
              name: "foo",
              flags: ["T"],
              dynamic: true,
            },
          ])
          .mockReturnValueOnce(keyHandlers[1].authDescriptor.id),
      };

      const service = createAuthDataService(connection);
      const authenticator = createAuthenticator(
        Buffer.alloc(0),
        keyHandlers,
        service,
      );
      await authenticator.getKeyHandlerForOperation(op("foo"));
      expect(
        (connection.query as jest.Mock).mock.calls[1][0].args.ad_ids[0],
      ).toStrictEqual(keyHandlers[1].authDescriptor.id);
    });

    it("does not call backend if auth handler is not dynamic", async () => {
      const { keyPair: kp1, authDescriptor: ad1 } = createTestAuthDescriptor([
        "T",
      ]);

      const keyHandlers = [
        createFtKeyHandler(ad1, createInMemoryFtKeyStore(kp1)),
      ];

      connection = {
        ...connection,
        query: jest
          .fn()
          .mockReturnValueOnce([
            {
              name: "foo",
              flags: ["T"],
              dynamic: false,
            },
          ])
          .mockReturnValueOnce(keyHandlers[0].authDescriptor.id),
      };

      const service = createAuthDataService(connection);
      const authenticator = createAuthenticator(
        Buffer.alloc(0),
        keyHandlers,
        service,
      );
      await authenticator.getKeyHandlerForOperation(op("foo"));
      expect(connection.query).toHaveBeenCalledTimes(1);
    });

    it("it prefers non interactive keyhandlers", async () => {
      const { keyPair: kp1, authDescriptor: ad1 } = createTestAuthDescriptor([
        "T",
      ]);

      const keyHandlers = [
        createEvmKeyHandler(ad1, createInMemoryEvmKeyStore(kp1)),
        createFtKeyHandler(ad1, createInMemoryFtKeyStore(kp1)),
      ];

      connection = {
        ...connection,
        query: jest
          .fn()
          .mockReturnValueOnce([
            {
              name: "foo",
              flags: ["T"],
              dynamic: true,
            },
          ])
          .mockReturnValueOnce(keyHandlers[1].authDescriptor.id),
      };

      const service = createAuthDataService(connection);
      const authenticator = createAuthenticator(
        Buffer.alloc(0),
        keyHandlers,
        service,
      );
      await authenticator.getKeyHandlerForOperation(op("foo"));
      expect(
        (connection.query as jest.Mock).mock.calls[1][0].args.ad_ids[0],
      ).toStrictEqual(keyHandlers[1].authDescriptor.id);
    });

    it("it calls backend to resolve scope if no handler is found", async () => {
      const { keyPair: kp1, authDescriptor: ad1 } = createTestAuthDescriptor([
        "T",
      ]);

      const keyHandlers = [
        createEvmKeyHandler(ad1, createInMemoryEvmKeyStore(kp1)),
        createFtKeyHandler(ad1, createInMemoryFtKeyStore(kp1)),
      ];

      connection = {
        ...connection,
        query: jest
          .fn()
          .mockReturnValueOnce([
            {
              name: "foo",
              flags: ["T"],
              dynamic: true,
            },
          ])
          .mockReturnValueOnce({
            name: "app",
            flags: ["A", "T"],
            dynamic: true,
          }),
      };

      const service = createAuthDataService(connection);
      const authenticator = createAuthenticator(
        Buffer.alloc(0),
        keyHandlers,
        service,
      );
      await authenticator.getKeyHandlerForOperation(op("foo2"));
      expect(
        (connection.query as jest.Mock).mock.calls[1][0].name,
      ).toStrictEqual("ft4.get_auth_handler_for_operation");
    });
  });
});
