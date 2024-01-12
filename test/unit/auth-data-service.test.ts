import {
  createEvmKeyHandler,
  createInMemoryEvmKeyStore,
  createInMemoryFtKeyStore,
} from "@ft4/authentication";
import { createFtKeyHandler } from "@ft4/authentication/ft/key-handler";
import { createAuthDataService, createConnection } from "@ft4/ft-session";
import { Connection } from "@ft4/types";
import { createStubClient } from "@ft4/util/blockchain-util";
import { createTestAuthDescriptor } from "@ft4/util/util";

describe("AuthDataService", () => {
  let connection: Connection;

  beforeAll(async () => {
    connection = createConnection(await createStubClient());
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
      service.getAllowedKeyHandler("foo", undefined, ad1.id, keyHandlers);
      expect(connection.query).toHaveBeenCalledTimes(1);
    });

    it("returns the first key handler if no matching auth handler", async () => {
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
      const selectedHandler = await service.getAllowedKeyHandler(
        "does not exist",
        undefined,
        ad1.id,
        keyHandlers,
      );
      expect(selectedHandler).toStrictEqual(keyHandlers[0]);
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
      const selectedHandler = await service.getAllowedKeyHandler(
        "foo",
        undefined,
        ad1.id,
        keyHandlers,
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
      await service.getAllowedKeyHandler("foo", undefined, ad1.id, keyHandlers);
      expect(
        (connection.query as jest.Mock).mock.calls[1][0].args.ad_ids[0],
      ).toStrictEqual(keyHandlers[1].authDescriptor.id);
    });

    it("does not call backend if auth handler is not dynamic", async () => {
      const { keyPair: kp1, authDescriptor: ad1 } = createTestAuthDescriptor([
        "T",
      ]);

      const keyHandlers1 = [
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
          .mockReturnValueOnce(keyHandlers1[0].authDescriptor.id),
      };

      const service = createAuthDataService(connection);
      await service.getAllowedKeyHandler(
        "foo",
        undefined,
        ad1.id,
        keyHandlers1,
      );
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
      await service.getAllowedKeyHandler("foo", undefined, ad1.id, keyHandlers);
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
      await service.getAllowedKeyHandler(
        "foo2",
        undefined,
        ad1.id,
        keyHandlers,
      );
      expect(
        (connection.query as jest.Mock).mock.calls[1][0].name,
      ).toStrictEqual("ft4.get_auth_handler_for_operation");
    });
  });
});
