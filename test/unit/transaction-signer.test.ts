import {
  createFakeAuthDataService,
  emptyOp,
  testAdFromRegistration,
} from "@ft4-test/util";
import {
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
import { GTX, KeyPair, encryption, formatter, gtx } from "postchain-client";

describe("Transaction Signer", () => {
  const blockchainRid = formatter.toBuffer("ABCD1234");
  let accountId: Buffer;
  let keyPair: KeyPair;
  let ftKeyHandler: KeyHandler;
  let evmKeyHandler: KeyHandler;
  let ftAuthenticator: Authenticator;
  let evmAuthenticator: Authenticator;
  let authDataService: AuthDataService;
  let gtxTx: GTX;

  beforeEach(async () => {
    accountId = encryption.randomBytes(32);
    keyPair = encryption.makeKeyPair();

    const ftKeyStore = createInMemoryFtKeyStore(keyPair);
    const evmKeyStore = createInMemoryEvmKeyStore(keyPair);
    const ftAd = testAdFromRegistration(
      createSingleSigAuthDescriptorRegistration(
        [AuthFlag.Transfer],
        ftKeyStore.pubKey,
        null,
      ),
    );
    const evmAd = testAdFromRegistration(
      createSingleSigAuthDescriptorRegistration(
        [AuthFlag.Transfer],
        evmKeyStore.address,
        null,
      ),
    );
    ftAuthenticator = createAuthenticator(
      accountId,
      [createFtKeyHandler(ftAd, ftKeyStore)],
      authDataService,
    );
    evmAuthenticator = createAuthenticator(
      accountId,
      [createEvmKeyHandler(ftAd, evmKeyStore)],
      authDataService,
    );
    ftKeyHandler = createInMemoryFtKeyStore(keyPair).createKeyHandler(ftAd);
    evmKeyHandler = createInMemoryEvmKeyStore(keyPair).createKeyHandler(evmAd);

    authDataService = createFakeAuthDataService({
      ["ft4.transfer"]: { flags: [AuthFlag.Transfer], message: "" },
      ["ft4.admin.register_account"]: {
        flags: [AuthFlag.Account],
        message: "",
      },
      ["testOperation"]: { flags: [], message: "" },
    });

    gtxTx = gtx.emptyGtx(blockchainRid);
    gtxTx.signatures = [];
    gtxTx.signers = [];
  });

  describe("signTransaction()", () => {
    it("Can take a SignedTransaction", async () => {
      expect(
        gtx.deserialize(
          await signTransaction(ftAuthenticator, gtx.serialize(gtxTx)),
        ),
      ).toStrictEqual(gtxTx);
    });

    it("Can take a RawGtx", async () => {
      expect(
        gtx.deserialize(
          await signTransaction(ftAuthenticator, gtx.gtxToRawGtx(gtxTx)),
        ),
      ).toStrictEqual(gtxTx);
    });

    it("Can take a GTX", async () => {
      expect(
        gtx.deserialize(await signTransaction(ftAuthenticator, gtxTx)),
      ).toStrictEqual(gtxTx);
    });

    it("Rejects transaction without signatures array", async () => {
      await expect(
        signTransaction(ftAuthenticator, gtx.emptyGtx(blockchainRid)),
      ).rejects.toThrow("No signatures array");
    });

    it("Rejects transaction with signatures array of different length than signers array", async () => {
      gtxTx.signers = [keyPair.pubKey];

      await expect(signTransaction(ftAuthenticator, gtxTx)).rejects.toThrow(
        "signatures.length != signers.length: 0 != 1",
      );
    });

    it("Rejects transaction with existing GTX signatures when using EVM key stores", async () => {
      gtxTx.operations = [
        evmAuth(accountId, evmKeyHandler.authDescriptor.id, []),
      ].map((o) => ({ opName: o.name, args: o.args! }));
      gtxTx.signers = [keyPair.pubKey];
      gtxTx.signatures = [await ftKeyHandler.sign(gtxTx)];

      await expect(signTransaction(evmAuthenticator, gtxTx)).rejects.toThrow(
        "Cannot add EVM signatures after GTX signature has been added",
      );
    });

    it("Adds GTX signature", async () => {
      gtxTx.signers = [keyPair.pubKey];
      gtxTx.signatures = [EMPTY_SIGNATURE];

      expect(
        gtx.deserialize(await signTransaction(ftAuthenticator, gtxTx))
          .signatures,
      ).toStrictEqual([await ftKeyHandler.sign(gtxTx)]);
    });

    it("Adds missing GTX signature", async () => {
      const initialKeyPair = encryption.makeKeyPair();

      gtxTx.signers = [initialKeyPair.pubKey, keyPair.pubKey];
      const initialSignature =
        await createInMemoryFtKeyStore(initialKeyPair).sign(gtxTx);
      gtxTx.signatures = [initialSignature, EMPTY_SIGNATURE];

      expect(
        gtx.deserialize(await signTransaction(ftAuthenticator, gtxTx))
          .signatures,
      ).toStrictEqual([initialSignature, await ftKeyHandler.sign(gtxTx)]);
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
      const evmAuthOp = evmAuth(accountId, deriveAuthDescriptorId(ad), []);
      evmAuthOp.args![2] = [
        EMPTY_SIGNATURE,
        EMPTY_SIGNATURE,
        EMPTY_SIGNATURE,
        EMPTY_SIGNATURE,
      ];
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
      expect(
        gtx.deserialize(
          await signTransactionWithKeyStores([], authDataService, gtxTx),
        ),
      ).toStrictEqual(gtxTx);
    });

    it("Rejects transaction without signatures array", async () => {
      await expect(
        signTransactionWithKeyStores(
          [],
          authDataService,
          gtx.emptyGtx(blockchainRid),
        ),
      ).rejects.toThrow("No signatures array");
    });

    it("Rejects transaction with signatures array of different length than signers array", async () => {
      gtxTx.signers = [keyPair.pubKey];
      await expect(
        signTransactionWithKeyStores([], authDataService, gtxTx),
      ).rejects.toThrow("signatures.length != signers.length: 0 != 1");
    });

    it("Rejects transaction with existing GTX signatures when using EVM key stores", async () => {
      const keyStore = createInMemoryEvmKeyStore(keyPair);

      gtxTx.operations = [evmSignatures([], [])].map((o) => ({
        opName: o.name,
        args: o.args!,
      }));
      gtxTx.signers = [keyPair.pubKey];
      gtxTx.signatures = [await ftKeyHandler.sign(gtxTx)];

      await expect(
        signTransactionWithKeyStores([keyStore], authDataService, gtxTx),
      ).rejects.toThrow(
        "Cannot add EVM signatures after GTX signature has been added",
      );
    });

    it("Adds GTX signature", async () => {
      gtxTx.signers = [keyPair.pubKey];
      gtxTx.signatures = [EMPTY_SIGNATURE];

      expect(
        gtx.deserialize(
          await signTransactionWithKeyStores(
            [ftKeyHandler.keyStore],
            authDataService,
            gtxTx,
          ),
        ).signatures,
      ).toStrictEqual([await ftKeyHandler.sign(gtxTx)]);
    });

    it("Adds missing GTX signature", async () => {
      const initialKeyPair = encryption.makeKeyPair();

      gtxTx.signers = [initialKeyPair.pubKey, keyPair.pubKey];
      const initialSignature =
        await createInMemoryFtKeyStore(initialKeyPair).sign(gtxTx);
      gtxTx.signatures = [initialSignature, EMPTY_SIGNATURE];

      expect(
        gtx.deserialize(
          await signTransactionWithKeyStores(
            [ftKeyHandler.keyStore],
            authDataService,
            gtxTx,
          ),
        ).signatures,
      ).toStrictEqual([initialSignature, await ftKeyHandler.sign(gtxTx)]);
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
