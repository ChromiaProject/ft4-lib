import {
  createFakeAuthDataService,
  createTestAuthDescriptor,
  emptyOp,
  testAdFromRegistration,
} from "@ft4-test/util";
import {
  AnyAuthDescriptor,
  AuthFlag,
  createMultiSigAuthDescriptorRegistration,
  createSingleSigAuthDescriptorRegistration,
  deriveAuthDescriptorId,
} from "@ft4/accounts";
import {
  AuthDataService,
  Authenticator,
  KeyHandler,
  createAuthenticator,
  createEvmKeyHandler,
  createFtKeyHandler,
  createInMemoryEvmKeyStore,
  createInMemoryFtKeyStore,
  evmAuth,
  toRawSignature,
} from "@ft4/authentication";
import { noopAuthDataService } from "@ft4/authentication/noop";
import {
  EMPTY_SIGNATURE,
  signTransaction,
  signTransactionWithKeyStores,
} from "@ft4/transaction-builder";
import { evmSignatures } from "@ft4/transaction-builder/utils";
import { nop } from "@ft4/utils";
import { Buffer } from "buffer";
import { KeyPair, encryption, formatter, gtx } from "postchain-client";

describe("Transaction Signer", () => {
  const blockchainRid = formatter.toBuffer("ABCD1234");
  let accountId: Buffer;
  let authDescriptor: AnyAuthDescriptor;
  let keyPair: KeyPair;
  let keyHandler: KeyHandler;
  let authDataService: AuthDataService;
  let authenticator: Authenticator;

  /*
  const mockOperation: Operation = {
    name: "testOperation",
    args: [],
  };
   */

  function setupTestEnvironment(
    exposureLogicFn?: (operationName: string) => Promise<boolean>,
  ) {
    accountId = encryption.randomBytes(32);

    const { keyPair: pair, authDescriptor: ad } = createTestAuthDescriptor([
      AuthFlag.Transfer,
    ]);
    authDescriptor = ad;
    keyPair = pair;

    keyHandler =
      createInMemoryFtKeyStore(keyPair).createKeyHandler(authDescriptor);

    authDataService = createFakeAuthDataService(
      {
        ["ft4.transfer"]: { flags: [AuthFlag.Transfer], message: "" },
        ["ft4.admin.register_account"]: {
          flags: [AuthFlag.Account],
          message: "",
        },
        ["testOperation"]: { flags: [], message: "" },
      },
      exposureLogicFn,
    );

    authenticator = createAuthenticator(accountId, [], authDataService);
  }

  beforeEach(async () => {
    setupTestEnvironment();
  });

  describe("signTransaction()", () => {
    it("Can take a SignedTransaction", async () => {
      const gtxTx = gtx.emptyGtx(blockchainRid);
      gtxTx.signatures = [];

      expect(
        gtx.deserialize(
          await signTransaction(authenticator, gtx.serialize(gtxTx)),
        ),
      ).toStrictEqual(gtxTx);
    });

    it("Can take a RawGtx", async () => {
      const gtxTx = gtx.emptyGtx(blockchainRid);
      gtxTx.signatures = [];

      expect(
        gtx.deserialize(
          await signTransaction(authenticator, gtx.gtxToRawGtx(gtxTx)),
        ),
      ).toStrictEqual(gtxTx);
    });

    it("Can take a GTX", async () => {
      const gtxTx = gtx.emptyGtx(blockchainRid);
      gtxTx.signatures = [];

      expect(
        gtx.deserialize(await signTransaction(authenticator, gtxTx)),
      ).toStrictEqual(gtxTx);
    });

    it("Rejects transaction without signatures array", async () => {
      const gtxTx = gtx.emptyGtx(blockchainRid);

      await expect(signTransaction(authenticator, gtxTx)).rejects.toThrow(
        "No signatures array",
      );
    });

    it("Rejects transaction with signatures array of different length than signers array", async () => {
      const gtxTx = gtx.emptyGtx(blockchainRid);
      gtxTx.signers = [keyPair.pubKey];
      gtxTx.signatures = [];

      await expect(signTransaction(authenticator, gtxTx)).rejects.toThrow(
        "signatures.length != signers.length: 0 != 1",
      );
    });

    it("Rejects transaction with existing GTX signatures when using EVM key stores", async () => {
      const keyStore = createInMemoryEvmKeyStore(keyPair);
      const ad = createSingleSigAuthDescriptorRegistration(
        [AuthFlag.Transfer],
        keyStore.address,
        null,
      );
      const authenticator = createAuthenticator(
        accountId,
        [createEvmKeyHandler(testAdFromRegistration(ad), keyStore)],
        authDataService,
      );

      const gtxTx = gtx.emptyGtx(blockchainRid);
      gtxTx.operations = [
        evmAuth(accountId, deriveAuthDescriptorId(ad), []),
      ].map((o) => ({ opName: o.name, args: o.args! }));
      gtxTx.signers = [keyPair.pubKey];
      gtxTx.signatures = [await keyHandler.sign(gtxTx)];

      await expect(signTransaction(authenticator, gtxTx)).rejects.toThrow(
        "Cannot add EVM signatures after GTX signature has been added",
      );
    });

    it("Adds GTX signature", async () => {
      const keyStore = createInMemoryFtKeyStore(keyPair);
      const ad = createSingleSigAuthDescriptorRegistration(
        [AuthFlag.Transfer],
        keyStore.pubKey,
        null,
      );
      const authenticator = createAuthenticator(
        accountId,
        [createFtKeyHandler(testAdFromRegistration(ad), keyStore)],
        authDataService,
      );

      const gtxTx = gtx.emptyGtx(blockchainRid);
      gtxTx.signers = [keyPair.pubKey];
      gtxTx.signatures = [EMPTY_SIGNATURE];

      expect(
        gtx.deserialize(await signTransaction(authenticator, gtxTx)).signatures,
      ).toStrictEqual([await keyHandler.sign(gtxTx)]);
    });

    it("Adds missing GTX signature", async () => {
      const keyStore = createInMemoryFtKeyStore(keyPair);
      const ad = createSingleSigAuthDescriptorRegistration(
        [AuthFlag.Transfer],
        keyStore.pubKey,
        null,
      );
      const authenticator = createAuthenticator(
        accountId,
        [createFtKeyHandler(testAdFromRegistration(ad), keyStore)],
        authDataService,
      );

      const initialKeyPair = encryption.makeKeyPair();

      const gtxTx = gtx.emptyGtx(blockchainRid);
      gtxTx.signers = [initialKeyPair.pubKey, keyPair.pubKey];
      const initialSignature =
        await createInMemoryFtKeyStore(initialKeyPair).sign(gtxTx);
      gtxTx.signatures = [initialSignature, EMPTY_SIGNATURE];

      expect(
        gtx.deserialize(await signTransaction(authenticator, gtxTx)).signatures,
      ).toStrictEqual([initialSignature, await keyHandler.sign(gtxTx)]);
    });

    it("Adds missing EVM signature to evm_signatures", async () => {
      const mockSignature = { r: Buffer.from("a"), s: Buffer.from("s"), v: 26 };
      const keyStore = createInMemoryEvmKeyStore(keyPair);
      const mockKeyStore = {
        ...keyStore,
        signMessage: jest.fn().mockReturnValue(mockSignature),
      };
      const ad = createSingleSigAuthDescriptorRegistration(
        [AuthFlag.Account],
        mockKeyStore.address,
        null,
      );
      const mockAuthDataService = {
        ...authDataService,
        getAuthMessageTemplate: jest.fn().mockReturnValue(""),
      };
      const authenticator = createAuthenticator(
        accountId,
        [createEvmKeyHandler(testAdFromRegistration(ad), mockKeyStore)],
        mockAuthDataService,
      );
      const gtxTx = gtx.emptyGtx(blockchainRid);
      gtxTx.signers = [];
      gtxTx.signatures = [];
      const evmSignaturesOp = evmSignatures([mockKeyStore.address], []);
      evmSignaturesOp.args![1] = [null];
      gtxTx.operations = [evmSignaturesOp, nop()].map((o) => ({
        opName: o.name,
        args: o.args!,
      }));
      const signedGtxTx = await signTransaction(authenticator, gtxTx);
      expect(gtx.deserialize(signedGtxTx).operations[0].args[1]).toStrictEqual([
        toRawSignature(mockSignature),
      ]);
    });

    it("Adds missing EVM signature to evm_auth", async () => {
      const mockSignature = { r: Buffer.from("a"), s: Buffer.from("s"), v: 26 };
      const keyStore = createInMemoryEvmKeyStore(keyPair);
      const mockKeyStore = {
        ...keyStore,
        signMessage: jest.fn().mockReturnValue(mockSignature),
      };
      const ad = createSingleSigAuthDescriptorRegistration(
        [AuthFlag.Account],
        mockKeyStore.address,
        null,
      );
      const mockAuthDataService = {
        ...authDataService,
        getAuthMessageTemplate: jest.fn().mockReturnValue(""),
      };
      const authenticator = createAuthenticator(
        accountId,
        [createEvmKeyHandler(testAdFromRegistration(ad), mockKeyStore)],
        mockAuthDataService,
      );
      const gtxTx = gtx.emptyGtx(blockchainRid);
      gtxTx.signers = [];
      gtxTx.signatures = [];
      const evmAuthOp = evmAuth(accountId, deriveAuthDescriptorId(ad), []);
      evmAuthOp.args![2] = [null];
      gtxTx.operations = [evmAuthOp, nop()].map((o) => ({
        opName: o.name,
        args: o.args!,
      }));
      const signedGtxTx = await signTransaction(authenticator, gtxTx);
      expect(gtx.deserialize(signedGtxTx).operations[0].args[2]).toStrictEqual([
        toRawSignature(mockSignature),
      ]);
    });

    it("Adds EVM signature to the same position in the signatures array as the corresponding signer position", async () => {
      const mockSignature = { r: Buffer.from("a"), s: Buffer.from("s"), v: 26 };
      const keyStore1 = createInMemoryEvmKeyStore(encryption.makeKeyPair());
      const keyStore2 = createInMemoryEvmKeyStore(keyPair);
      const keyStore3 = createInMemoryEvmKeyStore(encryption.makeKeyPair());
      const keyStore4 = createInMemoryEvmKeyStore(encryption.makeKeyPair());
      const mockKeyStore = {
        ...keyStore2,
        signMessage: jest.fn().mockReturnValue(mockSignature),
      };

      const ad = createMultiSigAuthDescriptorRegistration(
        [AuthFlag.Account],
        [
          keyStore1.address,
          keyStore3.address,
          mockKeyStore.address,
          keyStore4.address,
        ],
        2,
        null,
      );
      const mockAuthDataService = {
        ...authDataService,
        getAuthMessageTemplate: jest.fn().mockReturnValue(""),
      };
      const authenticator = createAuthenticator(
        accountId,
        [createEvmKeyHandler(testAdFromRegistration(ad), mockKeyStore)],
        mockAuthDataService,
      );
      const gtxTx = gtx.emptyGtx(blockchainRid);
      const evmAuthOp = evmAuth(accountId, deriveAuthDescriptorId(ad), []);
      evmAuthOp.args![2] = [
        EMPTY_SIGNATURE,
        EMPTY_SIGNATURE,
        EMPTY_SIGNATURE,
        EMPTY_SIGNATURE,
      ];
      gtxTx.signers = [];
      gtxTx.signatures = [];
      gtxTx.operations = [evmAuthOp, nop()].map((o) => ({
        opName: o.name,
        args: o.args!,
      }));
      const signedGtxTx = await signTransaction(authenticator, gtxTx);
      expect(gtx.deserialize(signedGtxTx).operations[0].args[2]).toStrictEqual([
        EMPTY_SIGNATURE,
        EMPTY_SIGNATURE,
        toRawSignature(mockSignature),
        EMPTY_SIGNATURE,
      ]);
    });

    it("Throws an error when encountering a malformed transaction", async () => {
      const keyStore = createInMemoryEvmKeyStore(encryption.makeKeyPair());

      const ad = createSingleSigAuthDescriptorRegistration(
        [AuthFlag.Account],
        keyStore.address,
      );
      const authenticator = createAuthenticator(
        accountId,
        [createEvmKeyHandler(testAdFromRegistration(ad), keyStore)],
        noopAuthDataService,
      );

      const gtxTx = gtx.emptyGtx(blockchainRid);
      gtxTx.signers = [];
      gtxTx.signatures = [];
      const evmAuthOp = evmAuth(accountId, deriveAuthDescriptorId(ad), []);
      gtxTx.operations = [evmAuthOp, evmAuthOp, evmAuthOp, emptyOp()].map(
        (o) => ({ opName: o.name, args: o.args ?? [] }),
      );

      await expect(signTransaction(authenticator, gtxTx)).rejects.toStrictEqual(
        new Error(
          "Transaction is malformed. Expected regular operation but got auth operation",
        ),
      );
    });
  });

  describe("signTransactionWithKeyStores()", () => {
    it("Can take a SignedTransaction", async () => {
      const gtxTx = gtx.emptyGtx(blockchainRid);
      gtxTx.signatures = [];

      expect(
        gtx.deserialize(
          await signTransactionWithKeyStores(
            [],
            authDataService,
            gtx.serialize(gtxTx),
          ),
        ),
      ).toStrictEqual(gtxTx);
    });

    it("Can take a RawGtx", async () => {
      const gtxTx = gtx.emptyGtx(blockchainRid);
      gtxTx.signatures = [];

      expect(
        gtx.deserialize(
          await signTransactionWithKeyStores(
            [],
            authDataService,
            gtx.gtxToRawGtx(gtxTx),
          ),
        ),
      ).toStrictEqual(gtxTx);
    });

    it("Can take a GTX", async () => {
      const gtxTx = gtx.emptyGtx(blockchainRid);
      gtxTx.signatures = [];

      expect(
        gtx.deserialize(
          await signTransactionWithKeyStores([], authDataService, gtxTx),
        ),
      ).toStrictEqual(gtxTx);
    });

    it("Rejects transaction without signatures array", async () => {
      const gtxTx = gtx.emptyGtx(blockchainRid);

      await expect(
        signTransactionWithKeyStores([], authDataService, gtxTx),
      ).rejects.toThrow("No signatures array");
    });

    it("Rejects transaction with signatures array of different length than signers array", async () => {
      const gtxTx = gtx.emptyGtx(blockchainRid);
      gtxTx.signers = [keyPair.pubKey];
      gtxTx.signatures = [];

      await expect(
        signTransactionWithKeyStores([], authDataService, gtxTx),
      ).rejects.toThrow("signatures.length != signers.length: 0 != 1");
    });

    it("Rejects transaction with existing GTX signatures when using EVM key stores", async () => {
      const keyStore = createInMemoryEvmKeyStore(keyPair);

      const gtxTx = gtx.emptyGtx(blockchainRid);
      gtxTx.operations = [evmSignatures([], [])].map((o) => ({
        opName: o.name,
        args: o.args!,
      }));
      gtxTx.signers = [keyPair.pubKey];
      gtxTx.signatures = [await keyHandler.sign(gtxTx)];

      await expect(
        signTransactionWithKeyStores([keyStore], authDataService, gtxTx),
      ).rejects.toThrow(
        "Cannot add EVM signatures after GTX signature has been added",
      );
    });

    it("Adds GTX signature", async () => {
      const keyStore = createInMemoryFtKeyStore(keyPair);

      const gtxTx = gtx.emptyGtx(blockchainRid);
      gtxTx.signers = [keyPair.pubKey];
      gtxTx.signatures = [EMPTY_SIGNATURE];

      expect(
        gtx.deserialize(
          await signTransactionWithKeyStores(
            [keyStore],
            authDataService,
            gtxTx,
          ),
        ).signatures,
      ).toStrictEqual([await keyHandler.sign(gtxTx)]);
    });

    it("Adds missing GTX signature", async () => {
      const keyStore = createInMemoryFtKeyStore(keyPair);

      const initialKeyPair = encryption.makeKeyPair();

      const gtxTx = gtx.emptyGtx(blockchainRid);
      gtxTx.signers = [initialKeyPair.pubKey, keyPair.pubKey];
      const initialSignature =
        await createInMemoryFtKeyStore(initialKeyPair).sign(gtxTx);
      gtxTx.signatures = [initialSignature, EMPTY_SIGNATURE];

      expect(
        gtx.deserialize(
          await signTransactionWithKeyStores(
            [keyStore],
            authDataService,
            gtxTx,
          ),
        ).signatures,
      ).toStrictEqual([initialSignature, await keyHandler.sign(gtxTx)]);
    });

    it("Adds missing EVM signature to evm_signatures", async () => {
      const mockSignature = { r: Buffer.from("a"), s: Buffer.from("s"), v: 26 };
      const keyStore = createInMemoryEvmKeyStore(keyPair);
      const mockKeyStore = {
        ...keyStore,
        signMessage: jest.fn().mockReturnValue(mockSignature),
      };
      const mockAuthDataService = {
        ...authDataService,
        getAuthMessageTemplate: jest.fn().mockReturnValue(""),
      };
      const gtxTx = gtx.emptyGtx(blockchainRid);
      gtxTx.signers = [];
      gtxTx.signatures = [];
      const evmSignaturesOp = evmSignatures([mockKeyStore.address], []);
      evmSignaturesOp.args![1] = [null];
      gtxTx.operations = [evmSignaturesOp, nop()].map((o) => ({
        opName: o.name,
        args: o.args!,
      }));
      const signedGtxTx = await signTransactionWithKeyStores(
        [mockKeyStore],
        mockAuthDataService,
        gtxTx,
      );
      expect(gtx.deserialize(signedGtxTx).operations[0].args[1]).toStrictEqual([
        toRawSignature(mockSignature),
      ]);
    });
  });
});
