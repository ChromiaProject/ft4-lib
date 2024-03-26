import { Buffer } from "buffer";
import { createFakeAuthDataService } from "../util/fake-auth-data-service";
import { createTestAuthDescriptor } from "../util/util";
import { AuthFlag } from "@ft4/accounts/auth-descriptor";
import { AnyAuthDescriptor } from "@ft4/accounts/auth-descriptor/types";
import {
  AuthDataService,
  Authenticator,
  KeyHandler,
  createAuthenticator,
} from "@ft4/authentication";
import { createInMemoryFtKeyStore } from "@ft4/authentication/ft/key-stores/in-memory";
import { KeyPair, encryption, formatter, gtx } from "postchain-client";
import { Connection } from "@ft4/types";
import { createInMemoryEvmKeyStore } from "@ft4/authentication";
import { createSingleSigAuthDescriptorRegistration } from "@ft4/accounts/auth-descriptor";
import { createEvmKeyHandler } from "@ft4/authentication";
import { testAdFromRegistration } from "../util/util";
import { createFtKeyHandler } from "@ft4/authentication";
import { signTransaction } from "@ft4/transaction-builder/transaction-signer";
import { EMPTY_SIGNATURE } from "@ft4/transaction-builder/utils";

describe("Transaction Signer", () => {
  const blockchainRid = formatter.toBuffer("ABCD1234");
  let connection: Connection;
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
    connection = jest.fn() as unknown as Connection;

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

  it("Can take a SignedTransaction", async () => {
    const gtxTx = gtx.emptyGtx(blockchainRid);
    gtxTx.signatures = [];

    expect(
      gtx.deserialize(
        await signTransaction(connection, authenticator, gtx.serialize(gtxTx)),
      ),
    ).toStrictEqual(gtxTx);
  });

  it("Can take a RawGtx", async () => {
    const gtxTx = gtx.emptyGtx(blockchainRid);
    gtxTx.signatures = [];

    expect(
      gtx.deserialize(
        await signTransaction(
          connection,
          authenticator,
          gtx.gtxToRawGtx(gtxTx),
        ),
      ),
    ).toStrictEqual(gtxTx);
  });

  it("Can take a GTX", async () => {
    const gtxTx = gtx.emptyGtx(blockchainRid);
    gtxTx.signatures = [];

    expect(
      gtx.deserialize(await signTransaction(connection, authenticator, gtxTx)),
    ).toStrictEqual(gtxTx);
  });

  it("Rejects transaction without signatures array", async () => {
    const gtxTx = gtx.emptyGtx(blockchainRid);

    await expect(
      signTransaction(connection, authenticator, gtxTx),
    ).rejects.toThrow("No signatures array");
  });

  it("Rejects transaction with signatures array of different length than signers array", async () => {
    const gtxTx = gtx.emptyGtx(blockchainRid);
    gtxTx.signers = [keyPair.pubKey];
    gtxTx.signatures = [];

    await expect(
      signTransaction(connection, authenticator, gtxTx),
    ).rejects.toThrow("signatures.length != signers.length: 0 != 1");
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
    gtxTx.signers = [keyPair.pubKey];
    gtxTx.signatures = [await keyHandler.sign(gtxTx)];

    await expect(
      signTransaction(connection, authenticator, gtxTx),
    ).rejects.toThrow(
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
      gtx.deserialize(await signTransaction(connection, authenticator, gtxTx))
        .signatures,
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
      gtx.deserialize(await signTransaction(connection, authenticator, gtxTx))
        .signatures,
    ).toStrictEqual([initialSignature, await keyHandler.sign(gtxTx)]);
  });
});
