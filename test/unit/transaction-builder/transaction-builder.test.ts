import { Buffer } from "buffer";
import {
  createFakeAuthDataService,
  createTestAuthDescriptor,
  emptyOp,
  testAdFromRegistration,
} from "@ft4-test/util";
import {
  AnyAuthDescriptor,
  AuthFlag,
  aggregateSigners,
  createSingleSigAuthDescriptorRegistration,
  transfer,
} from "@ft4/accounts";
import { registerAccountAdminOp } from "@ft4/admin";
import { createAmount } from "@ft4/asset";
import {
  AuthDataService,
  Authenticator,
  FtKeyStore,
  KeyHandler,
  SigningError,
  createAuthenticator,
  createEvmKeyHandler,
  createFtKeyHandler,
  createInMemoryEvmKeyStore,
  createInMemoryFtKeyStore,
  noopAuthenticator,
} from "@ft4/authentication";
import {
  AuthorizationError,
  transactionBuilder,
} from "@ft4/transaction-builder";
import { nop, op } from "@ft4/utils";
import { ethers } from "ethers";
import {
  IClient,
  KeyPair,
  Operation,
  SignedTransaction,
  Web3PromiEvent,
  createStubClient,
  encryption,
  formatter,
  gtx,
} from "postchain-client";

describe("Transaction Builder", () => {
  let authenticator: Authenticator;
  let client: IClient;
  let keyPair: KeyPair;
  let authDescriptor: AnyAuthDescriptor;
  let keyHandler: KeyHandler;
  let authDataService: AuthDataService;

  const mockOperation: Operation = {
    name: "testOperation",
    args: [],
  };
  const accountId = encryption.randomBytes(32);

  function setupTestEnvironment(
    exposureLogicFn?: (operationName: string) => Promise<boolean>,
  ) {
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

    authenticator = createAuthenticator(
      accountId,
      [keyHandler],
      authDataService,
    );
  }

  beforeEach(async () => {
    setupTestEnvironment();
    client = await createStubClient();
    client.sendTransaction = jest.fn().mockReturnValue(
      new Web3PromiEvent((resolve, _reject) =>
        resolve({
          status: "confirmed",
          statusCode: 200,
          transactionRid: Buffer.alloc(32),
        }),
      ),
    );
  });

  it("builds and signs a transaction", async () => {
    const args = [Buffer.alloc(32), Buffer.alloc(32), BigInt(10)] as const;
    const tx = gtx.deserialize(
      await transactionBuilder(authenticator, client)
        .add(transfer(args[0], args[1], createAmount(args[2].toString(), 0)))
        .build(),
    );

    expect(tx.blockchainRid).toStrictEqual(
      formatter.toBuffer(client.config.blockchainRid),
    );
    expect(tx.operations).toStrictEqual([
      {
        opName: "ft4.ft_auth",
        args: [authenticator.accountId, authDescriptor.id],
      },
      { opName: "ft4.transfer", args },
    ]);
    expect(tx.signers).toStrictEqual(aggregateSigners(authDescriptor));
    expect(tx.signatures).toBeDefined();
  });

  it("can build transactions with a nop", async () => {
    const operation = nop();
    const tx = gtx.deserialize(
      await transactionBuilder(authenticator, client).add(operation).build(),
    );
    const { name, args } = operation;
    expect(tx.operations).toStrictEqual([{ opName: name, args }]);
  });

  it("does not sign transaction with only a nop on build", async () => {
    const tx = await transactionBuilder(authenticator, client)
      .add(nop())
      .build();
    expect(gtx.deserialize(tx).signers).toStrictEqual([]);
    expect(gtx.deserialize(tx).signatures).toStrictEqual([]);
  });

  it("throws an error if not sufficient permissions", async () => {
    const promise = transactionBuilder(authenticator, client)
      .add(registerAccountAdminOp(authDescriptor))
      .build();
    await expect(promise).rejects.toThrow(AuthorizationError);
  });

  it("uses additional signers provided", async () => {
    const tx = await transactionBuilder(authenticator, client)
      .add(nop())
      .addSigners(keyHandler.keyStore as FtKeyStore)
      .build();
    expect(gtx.deserialize(tx).signers).toStrictEqual(keyHandler.getSigners());
    expect(gtx.deserialize(tx).signatures).toBeDefined();
  });

  it("uses custom authenticator if provided", async () => {
    const { authenticatorMock, keyHandlerMock, keyStoreMock, authDescriptor } =
      getMocks();
    await transactionBuilder(authenticator, client)
      .add(registerAccountAdminOp(authDescriptor), {
        authenticator: authenticatorMock,
      })
      .build();
    expect(keyHandlerMock.authorize).toHaveBeenCalled();
    expect(keyStoreMock.sign).toHaveBeenCalled();
  });

  it("uses uses noop authenticator if authentication is not requested", async () => {
    const args = [Buffer.alloc(32), Buffer.alloc(32), BigInt(10)] as const;
    const tx = gtx.deserialize(
      await transactionBuilder(authenticator, client)
        .add(transfer(args[0], args[1], createAmount(args[2].toString(), 0)), {
          authenticator: noopAuthenticator,
        })
        .build(),
    );

    expect(tx.operations).toStrictEqual([{ opName: "ft4.transfer", args }]);
  });

  it("throws an error when the operation does not exist", async () => {
    setupTestEnvironment(() => Promise.resolve(false));

    const builder = transactionBuilder(authenticator, client);
    builder.add(mockOperation);

    await expect(builder.build()).rejects.toThrow(
      `Operation ${mockOperation.name} does not exist`,
    );
  });

  it("does not throw an error when the operation exists", async () => {
    setupTestEnvironment((operationName) =>
      Promise.resolve(operationName === mockOperation.name),
    );

    const builder = transactionBuilder(authenticator, client);
    builder.add(mockOperation);

    await expect(builder.build()).resolves.not.toThrow();
  });

  it("builds correct transaction", async () => {
    setupTestEnvironment((operationName) =>
      Promise.resolve(operationName === mockOperation.name),
    );

    const expectedTx = await gtx.sign(
      {
        blockchainRid: formatter.ensureBuffer(client.config.blockchainRid),
        operations: [
          {
            opName: "ft4.ft_auth",
            args: [authenticator.accountId, authDescriptor.id],
          },
          { opName: mockOperation.name, args: [] },
        ],
        signers: [keyPair.pubKey!],
      },
      keyPair.privKey,
      keyPair.pubKey,
    );

    const tx = await transactionBuilder(authenticator, client)
      .add(mockOperation)
      .build();

    expect(gtx.deserialize(tx)).toEqual(expectedTx);
  });

  it("can bypass authentication", async () => {
    const args = [Buffer.alloc(32), Buffer.alloc(32), BigInt(10)] as const;
    const tx = gtx.deserialize(
      await transactionBuilder(authenticator, client)
        .add(transfer(args[0], args[1], createAmount(args[2].toString(), 0)), {
          authenticator: noopAuthenticator,
        })
        .build(),
    );

    expect(tx.operations).toStrictEqual([{ opName: "ft4.transfer", args }]);
  });

  it("can build and submit a transaction, and emits 'built' event while doing so", async () => {
    const { authenticatorMock, keyPair } = getMocks();
    const operation = nop();
    const expectedTx = gtx.serialize({
      blockchainRid: formatter.ensureBuffer(client.config.blockchainRid),
      operations: [
        { opName: emptyOp().name, args: [] },
        { opName: operation.name, args: operation.args! },
      ],
      signers: [keyPair.pubKey],
    });

    let builtEvent: SignedTransaction | undefined = undefined;
    const { tx } = await transactionBuilder(authenticatorMock, client)
      .add(emptyOp())
      .add(operation)
      .buildAndSend()
      .on("built", (tx) => {
        builtEvent = tx;
      });

    expect(gtx.deserialize(tx)).toMatchObject({
      ...gtx.deserialize(expectedTx),
      signatures: expect.arrayContaining([]),
    });

    expect(builtEvent!.equals(tx));
  }, 5000);

  it("throw SigningError if user rejects FT signature", async () => {
    const keyPair = encryption.makeKeyPair();
    let keyStore = createInMemoryFtKeyStore(keyPair);
    const ad = createSingleSigAuthDescriptorRegistration(
      [AuthFlag.Transfer],
      keyStore.pubKey,
      null,
    );

    // Rewire the keystore to let us fake signing failure
    const sign = jest.fn().mockImplementation(() => {
      throw new Error("signing failed");
    });
    keyStore = { ...keyStore, sign };

    const authService = createFakeAuthDataService({
      foo: { flags: [AuthFlag.Transfer], message: "bogus" },
    });
    const authenticator = createAuthenticator(
      accountId,
      [createFtKeyHandler(testAdFromRegistration(ad), keyStore)],
      authService,
    );

    await expect(
      transactionBuilder(authenticator, client).add(op("foo")).build(),
    ).rejects.toThrow(SigningError);
  });

  it("throw SigningError if user rejects EVM signature", async () => {
    const keyPair = encryption.makeKeyPair();
    const message = "Sign this message with {nonce}";
    let keyStore = createInMemoryEvmKeyStore(keyPair);
    const ad = createSingleSigAuthDescriptorRegistration(
      [AuthFlag.Transfer],
      keyStore.address,
      null,
    );

    // Rewire the keystore to let us fake a user rejection
    const signMessage = jest.fn().mockImplementation(() => {
      const err = new Error() as ethers.ActionRejectedError;
      err.code = "ACTION_REJECTED";
      err.reason = "rejected";
      err.message = "signing rejected";
      err.shortMessage = "signing rejected";
      throw err;
    });
    keyStore = { ...keyStore, signMessage };

    const authService = createFakeAuthDataService({
      foo: { flags: [AuthFlag.Transfer], message },
    });
    const authenticator = createAuthenticator(
      accountId,
      [createEvmKeyHandler(testAdFromRegistration(ad), keyStore)],
      authService,
    );

    await expect(
      transactionBuilder(authenticator, client).add(op("foo")).build(),
    ).rejects.toThrow(SigningError);
  });
});

function getMocks() {
  const { authDescriptor, keyPair } = createTestAuthDescriptor([
    AuthFlag.Account,
  ]);

  const keyStoreMock: FtKeyStore = {
    id: keyPair.pubKey,
    pubKey: keyPair.pubKey,
    isInteractive: false,
    sign: jest.fn(),
    createKeyHandler: jest.fn(),
  };

  const keyHandlerMock: KeyHandler = {
    authDescriptor,
    keyStore: keyStoreMock,
    satisfiesAuthRequirements: jest.fn(),
    authorize: jest
      .fn()
      .mockImplementation((_accountId, operation) =>
        Promise.resolve([operation]),
      ),
    sign: keyStoreMock.sign,
    getSigners: jest.fn().mockReturnValue([keyPair.pubKey]),
  };
  const authenticatorMock: Authenticator = {
    accountId: Buffer.alloc(32),
    keyHandlers: [keyHandlerMock],
    authDataService: createFakeAuthDataService({}),
    getKeyHandlerForOperation: jest.fn().mockReturnValue(keyHandlerMock),
    getAuthDescriptorCounter: jest.fn().mockReturnValue(0),
  };
  return {
    authenticatorMock,
    keyHandlerMock,
    keyStoreMock,
    keyPair,
    authDescriptor,
  };
}
