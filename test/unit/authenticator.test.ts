import {
  createFakeAuthDataService,
  createTestAuthDescriptor,
} from "@ft4-test/util";
import {
  AnyAuthDescriptor,
  AuthDescriptor,
  AuthFlag,
  SingleSig,
} from "@ft4/accounts";
import {
  AuthDataService,
  FtKeyStore,
  KeyHandler,
  createAuthenticator,
  createEvmKeyHandler,
  createFtKeyHandler,
  createInMemoryEvmKeyStore,
  createInMemoryFtKeyStore,
} from "@ft4/authentication";
import {
  Connection,
  createAuthDataService,
  createConnection,
} from "@ft4/ft-session";
import { op } from "@ft4/utils";
import { Buffer } from "buffer";
import { KeyPair, createStubClient, encryption } from "postchain-client";

type ConnectionWithoutQuery = Omit<Connection, "query">;
type MockedQuery = {
  query: jest.Mock;
};

type MockedConnection = ConnectionWithoutQuery & MockedQuery;

describe("Authenticator", () => {
  let connection: MockedConnection;

  let keyPair1: KeyPair;
  let keyPair2: KeyPair;
  let authDescriptor1: AuthDescriptor<SingleSig>;
  let authDescriptor2: AuthDescriptor<SingleSig>;
  let ftKeyHandler1: KeyHandler;
  let ftKeyHandler2: KeyHandler;
  let authDataService: AuthDataService;
  beforeEach(async () => {
    connection = {
      ...createConnection(await createStubClient()),
      query: jest.fn(),
    };
    const { keyPair: kp1, authDescriptor: ad1 } = createTestAuthDescriptor([
      AuthFlag.Account,
    ]);
    const { keyPair: kp2, authDescriptor: ad2 } = createTestAuthDescriptor([
      AuthFlag.Transfer,
    ]);
    keyPair1 = kp1;
    keyPair2 = kp2;
    authDescriptor1 = ad1;
    authDescriptor2 = ad2;
    ftKeyHandler1 = createFtKeyHandler(
      authDescriptor1,
      createInMemoryFtKeyStore(keyPair1),
    );
    ftKeyHandler2 = createFtKeyHandler(
      authDescriptor2,
      createInMemoryFtKeyStore(keyPair2),
    );
    authDataService = createAuthDataService(connection);
  });

  it("uses non-interactive key store if both non-interactive and interactive auth handlers satisfy auth requirements", async () => {
    const { keyPair: keyPair1, authDescriptor: authDescriptor1 } =
      createTestAuthDescriptor([AuthFlag.Transfer], null);
    const { keyPair: keyPair2, authDescriptor: authDescriptor2 } =
      createTestAuthDescriptor([AuthFlag.Transfer], null);

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
        flags: [AuthFlag.Transfer],
        message: "",
      },
    });
    const authenticator = createAuthenticator(
      accountId,
      [authHandler1, authHandler2],
      authDataService,
      connection,
    );

    const authHandler = await authenticator.getKeyHandlerForOperation(
      op("foo"),
      {},
    );

    expect(authHandler2.authDescriptor.id).toEqual(
      authHandler!.authDescriptor.id,
    );
  });

  describe("getAllowedAuthHandler", () => {
    it("downloads all auth handlers", () => {
      connection.query.mockReturnValueOnce([
        { name: "foo", flags: [AuthFlag.Transfer], dynamic: false },
      ]);

      const authenticator = createAuthenticator(
        Buffer.alloc(0),
        [ftKeyHandler1, ftKeyHandler2],
        authDataService,
        connection,
      );

      authenticator.getKeyHandlerForOperation(op("foo"), {});
      expect(connection.query).toHaveBeenCalledTimes(1);
    });

    it("returns null if no matching auth handler", async () => {
      connection.query.mockReturnValueOnce([
        { name: "foo", flags: [AuthFlag.Transfer], dynamic: false },
      ]);

      const authenticator = createAuthenticator(
        Buffer.alloc(0),
        [ftKeyHandler1, ftKeyHandler2],
        authDataService,
        connection,
      );
      const selectedHandler = await authenticator.getKeyHandlerForOperation(
        op("does not exist"),
        {},
      );
      expect(selectedHandler).toStrictEqual(null);
    });

    it("returns key handler selected by backend", async () => {
      connection.query
        .mockReturnValueOnce([
          { name: "foo", flags: [AuthFlag.Transfer], dynamic: false },
        ])
        .mockReturnValueOnce(ftKeyHandler2.authDescriptor.id);

      const authenticator = createAuthenticator(
        Buffer.alloc(0),
        [ftKeyHandler1, ftKeyHandler2],
        authDataService,
        connection,
      );
      const selectedHandler = await authenticator.getKeyHandlerForOperation(
        op("foo"),
        {},
      );
      expect(selectedHandler).toStrictEqual(ftKeyHandler2);
    });

    it("only submits auth descriptors with matching flags", async () => {
      connection.query
        .mockReturnValueOnce([
          { name: "foo", flags: [AuthFlag.Transfer], dynamic: true },
        ])
        .mockReturnValueOnce(ftKeyHandler2.authDescriptor.id);

      const authenticator = createAuthenticator(
        Buffer.alloc(0),
        [ftKeyHandler1, ftKeyHandler2],
        authDataService,
        connection,
      );
      await authenticator.getKeyHandlerForOperation(op("foo"), {});
      expect(
        (connection.query as jest.Mock).mock.calls[1][0].args.ad_ids[0],
      ).toStrictEqual(ftKeyHandler2.authDescriptor.id);
    });

    it("does not call backend if auth handler is not dynamic", async () => {
      connection.query
        .mockReturnValueOnce([
          { name: "foo", flags: [AuthFlag.Transfer], dynamic: false },
        ])
        .mockReturnValueOnce(ftKeyHandler1.authDescriptor.id);

      const authenticator = createAuthenticator(
        Buffer.alloc(0),
        [ftKeyHandler1],
        authDataService,
        connection,
      );
      await authenticator.getKeyHandlerForOperation(op("foo"), {});
      expect(connection.query).toHaveBeenCalledTimes(1);
    });

    it("it prefers non interactive keyhandlers", async () => {
      const evmKeyHandler = createEvmKeyHandler(authDescriptor2, {
        ...createInMemoryEvmKeyStore(keyPair2),
        isInteractive: true,
      });
      const keyHandlers = [
        evmKeyHandler,
        createFtKeyHandler(authDescriptor2, createInMemoryFtKeyStore(keyPair2)),
      ];

      connection.query
        .mockReturnValueOnce([
          { name: "foo", flags: [AuthFlag.Transfer], dynamic: true },
        ])
        .mockReturnValueOnce(keyHandlers[1].authDescriptor.id);

      const authenticator = createAuthenticator(
        Buffer.alloc(0),
        keyHandlers,
        authDataService,
        connection,
      );
      const selectedKeyHandler = await authenticator.getKeyHandlerForOperation(
        op("foo"),
        {},
      );
      expect(selectedKeyHandler).toStrictEqual(keyHandlers[1]);
    });

    it("it calls backend to resolve scope if no handler is found", async () => {
      const keyHandlers = [
        createEvmKeyHandler(
          authDescriptor1,
          createInMemoryEvmKeyStore(keyPair1),
        ),
        createFtKeyHandler(authDescriptor1, createInMemoryFtKeyStore(keyPair1)),
      ];

      connection.query
        .mockReturnValueOnce([
          { name: "foo", flags: [AuthFlag.Transfer], dynamic: true },
        ])
        .mockReturnValueOnce({
          name: "app",
          flags: [AuthFlag.Account, AuthFlag.Transfer],
          dynamic: true,
        });

      const authenticator = createAuthenticator(
        Buffer.alloc(0),
        keyHandlers,
        authDataService,
        connection,
      );
      await authenticator.getKeyHandlerForOperation(op("foo2"), {});
      expect(
        (connection.query as jest.Mock).mock.calls[1][0].name,
      ).toStrictEqual("ft4.get_auth_handler_for_operation");
    });
  });
});
