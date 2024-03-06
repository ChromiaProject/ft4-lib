jest.mock("postchain-client", () => {
  const originalModule = jest.requireActual("postchain-client");

  return {
    __esModule: true,
    ...originalModule,
    isBlockAnchored: jest.fn().mockResolvedValue(false),
    getBlockAnchoringTransaction: jest.fn().mockResolvedValue(null),
    getAnchoringClient: jest.fn(),
    createClient: jest.fn(),
  };
});

jest.mock("@ft4/utils/directory-chain", () => {
  const originalModule = jest.requireActual("@ft4/utils/directory-chain");

  return {
    __esModule: true,
    ...originalModule,
    getSystemAnchoringChain: jest.fn().mockResolvedValue(Buffer.from("")),
  };
});

import { Buffer } from "buffer";
import { createFakeAuthDataService } from "../util/fake-auth-data-service";
import { createTestAuthDescriptor, emptyOp } from "../util/util";
import { transfer } from "@ft4/accounts/account-operations";
import { AuthFlag, aggregateSigners } from "@ft4/accounts/auth-descriptor";
import { AnyAuthDescriptor } from "@ft4/accounts/auth-descriptor/types";
import { registerAccount } from "@ft4/admin/admin-operations";
import { createAmount } from "@ft4/asset/amount";
import {
  AuthDataService,
  Authenticator,
  FtKeyStore,
  KeyHandler,
  createAuthenticator,
} from "@ft4/authentication";
import { createInMemoryFtKeyStore } from "@ft4/authentication/ft/key-stores/in-memory";
import { nop } from "@ft4/utils";
import {
  AuthorizationError,
  transactionBuilder,
} from "@ft4/utils/transaction-builder";
import { createNoopAuthenticator } from "@ft4/authentication/noop";
import { anchoredHandlerCallbackParameters } from "../util/blockchain-util";
import {
  IClient,
  isBlockAnchored,
  KeyPair,
  Operation,
  encryption,
  gtx,
} from "postchain-client";
import { createStubClient } from "postchain-client";
import { formatter } from "postchain-client";
import { AnchoringTimeoutError } from "@ft4/utils/transaction-builder";
import {
  getBlockAnchoringTransaction,
  SignedTransaction,
  TransactionReceipt,
  Web3PromiEvent,
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
  };

  function setupTestEnvironment(
    exposureLogicFn?: (operationName: string) => Promise<boolean>,
  ) {
    const accountId = encryption.randomBytes(32);

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
        .mockImplementation((accountId, operation) =>
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
      getNonce: jest.fn().mockReturnValue(0),
    };
    return {
      authenticatorMock,
      keyHandlerMock,
      keyStoreMock,
      keyPair,
      authDescriptor,
    };
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

  it("builds an unsigned transaction", async () => {
    const args = [Buffer.alloc(32), Buffer.alloc(32), BigInt(10)] as const;
    const tx = await transactionBuilder(authenticator, client)
      .add(transfer(args[0], args[1], createAmount(args[2].toString(), 0)))
      .buildUnsigned();

    expect(tx.operations).toStrictEqual([
      {
        opName: "ft4.ft_auth",
        args: [authenticator.accountId, authDescriptor.id],
      },
      { opName: "ft4.transfer", args },
    ]);
  });

  it("signs the transaction on build", async () => {
    const tx = await transactionBuilder(authenticator, client)
      .add(transfer(Buffer.alloc(32), Buffer.alloc(32), createAmount(10, 0)))
      .build();

    expect(gtx.deserialize(tx).signers).toStrictEqual(
      aggregateSigners(authDescriptor),
    );
    expect(gtx.deserialize(tx).signatures).toBeDefined();
  });

  it("can build transactions with a nop", async () => {
    const operation = nop();
    const tx = await transactionBuilder(authenticator, client)
      .add(operation)
      .buildUnsigned();
    const { name, args } = operation;
    expect(tx.operations).toStrictEqual([{ opName: name, args }]);
  });

  it("does not allow buildUnsigned() when there are onAnchoredHandlers", async () => {
    const promise = transactionBuilder(authenticator, client)
      .add(
        transfer(Buffer.alloc(32), Buffer.alloc(32), createAmount(10, 0)),
        (_data, _error) => null,
      )
      .buildUnsigned();
    await expect(promise).rejects.toThrowError(Error);
  });

  it("does not sign transaction with only a nop on build", async () => {
    const operation = nop();
    const tx = await transactionBuilder(authenticator, client)
      .add(operation)
      .build();
    expect(gtx.deserialize(tx).signers).toStrictEqual([]);
    expect(gtx.deserialize(tx).signatures).toStrictEqual([]);
  });

  it("does not allow build() when there are onAnchoredHandlers", async () => {
    const promise = transactionBuilder(authenticator, client)
      .add(
        transfer(Buffer.alloc(32), Buffer.alloc(32), createAmount(10, 0)),
        (_data, _error) => null,
      )
      .build();
    await expect(promise).rejects.toThrowError(Error);
  });

  it("does not allow buildAndSend() when there are onAnchoredHandlers", async () => {
    const promise = transactionBuilder(authenticator, client)
      .add(
        transfer(Buffer.alloc(32), Buffer.alloc(32), createAmount(10, 0)),
        (_data, _error) => null,
      )
      .buildAndSend();
    await expect(promise).rejects.toThrowError(Error);
  });

  it("does not allow buildAndSend() when there are onAnchoredHandlers", async () => {
    const promise = transactionBuilder(authenticator, client)
      .add(
        transfer(Buffer.alloc(32), Buffer.alloc(32), createAmount(10, 0)),
        (_data, _error) => null,
      )
      .buildAndSend();
    await expect(promise).rejects.toThrowError(Error);
  });

  it("throws an error if not sufficient permissions", async () => {
    const promise = transactionBuilder(authenticator, client)
      .add(registerAccount(authDescriptor))
      .buildUnsigned();
    await expect(promise).rejects.toThrowError(AuthorizationError);
  });

  it("uses additional signers provided", async () => {
    const operation = nop();
    const tx = await transactionBuilder(authenticator, client)
      .add(operation)
      .addSigners(keyHandler.keyStore as FtKeyStore)
      .build();
    expect(gtx.deserialize(tx).signers).toStrictEqual(keyHandler.getSigners());
    expect(gtx.deserialize(tx).signatures).toBeDefined();
  });

  it("uses custom authenticator if provided", async () => {
    const { authenticatorMock, keyHandlerMock, keyStoreMock, authDescriptor } =
      getMocks();
    await transactionBuilder(authenticator, client)
      .addWithAuthenticator(registerAccount(authDescriptor), authenticatorMock)
      .build();
    expect(keyHandlerMock.authorize).toHaveBeenCalled();
    expect(keyStoreMock.sign).toHaveBeenCalled();
  });

  it("uses uses noop authenticator if authentication is not requested", async () => {
    const args = [Buffer.alloc(32), Buffer.alloc(32), BigInt(10)] as const;
    const tx = await transactionBuilder(authenticator, client)
      .addWithoutAuthenticator(
        transfer(args[0], args[1], createAmount(args[2].toString(), 0)),
      )
      .buildUnsigned();

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
    const tx = await transactionBuilder(authenticator, client)
      .addWithAuthenticator(
        transfer(args[0], args[1], createAmount(args[2].toString(), 0)),
        createNoopAuthenticator(createFakeAuthDataService({})),
      )
      .buildUnsigned();

    expect(tx.operations).toStrictEqual([{ opName: "ft4.transfer", args }]);
  });

  it("can build and submit a transaction, and emits 'signed' event while doing so", async () => {
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

    let signedEvent: SignedTransaction | undefined = undefined;
    const { tx } = await transactionBuilder(authenticatorMock, client)
      .add(emptyOp())
      .add(operation)
      .buildAndSend()
      .on("signed", (tx) => {
        signedEvent = tx;
      });

    expect(gtx.deserialize(tx)).toMatchObject({
      ...gtx.deserialize(expectedTx),
      signatures: expect.arrayContaining([]),
    });

    expect(signedEvent!.equals(tx));
  }, 5000);

  describe("block anchored handling", () => {
    it("calls registered handler when block is anchored in system anchoring chain", async () => {
      (getBlockAnchoringTransaction as jest.Mock).mockReturnValueOnce({});
      (isBlockAnchored as jest.Mock).mockReturnValueOnce(true);
      const operation = nop();
      const callback: jest.Mock<any, any, any> = jest.fn();
      let signedEvent: SignedTransaction | undefined = undefined;
      let confirmedEvent: TransactionReceipt | undefined = undefined;
      const { tx, receipt } = await transactionBuilder(
        createNoopAuthenticator(createFakeAuthDataService({})),
        client,
        {
          retryCount: 10,
          waitTimeMs: 10,
        },
      )
        .add(emptyOp(), callback)
        .add(operation)
        .buildAndSendWithAnchoring()
        .on("signed", (tx) => {
          signedEvent = tx;
        })
        .on("confirmed", (receipt) => {
          confirmedEvent = receipt;
        });

      expect(callback).toHaveBeenCalledWith(
        anchoredHandlerCallbackParameters(client, [emptyOp(), operation], 0, 0),
        null,
      );

      expect(signedEvent!.equals(tx));
      expect(confirmedEvent!.transactionRid.equals(receipt.transactionRid));
    }, 5000);

    it("calls all registered handler when block is anchored in system anchoring chain", async () => {
      (getBlockAnchoringTransaction as jest.Mock).mockReturnValueOnce({});
      (isBlockAnchored as jest.Mock).mockReturnValueOnce(true);
      const operation = nop();
      const callback: jest.Mock<any, any, any> = jest.fn();
      const callback2: jest.Mock<any, any, any> = jest.fn();
      await transactionBuilder(
        createNoopAuthenticator(createFakeAuthDataService({})),
        client,
        {
          retryCount: 10,
          waitTimeMs: 10,
        },
      )
        .add(emptyOp(), callback)
        .add(emptyOp(), callback2)
        .add(operation)
        .buildAndSendWithAnchoring();

      expect(callback).toHaveBeenCalledWith(
        anchoredHandlerCallbackParameters(
          client,
          [emptyOp(), emptyOp(), operation],
          0,
          0,
        ),
        null,
      );
      expect(callback2).toHaveBeenCalledWith(
        anchoredHandlerCallbackParameters(
          client,
          [emptyOp(), emptyOp(), operation],
          1,
          1,
        ),
        null,
      );
    }, 5000);

    it("calls callbacks even if block is not anchored immediately", async () => {
      (getBlockAnchoringTransaction as jest.Mock)
        .mockReturnValueOnce(null)
        .mockReturnValueOnce({});
      (isBlockAnchored as jest.Mock)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);

      const operation = nop();
      const callback: jest.Mock<any, any, any> = jest.fn();
      await transactionBuilder(
        createNoopAuthenticator(createFakeAuthDataService({})),
        client,
        {
          retryCount: 10,
          waitTimeMs: 10,
        },
      )
        .add(emptyOp(), callback)
        .add(operation)
        .buildAndSendWithAnchoring();

      expect(callback).toHaveBeenCalledWith(
        anchoredHandlerCallbackParameters(client, [emptyOp(), operation], 0, 0),
        null,
      );
    }, 5000);

    it("calls callback with an error and reject the promise if polling for cluster anchoring times out", async () => {
      (getBlockAnchoringTransaction as jest.Mock)
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(null);

      const callback: jest.Mock<any, any, any> = jest.fn();
      const promise = transactionBuilder(
        createNoopAuthenticator(createFakeAuthDataService({})),
        client,
        {
          retryCount: 2,
          waitTimeMs: 1,
        },
      )
        .add(emptyOp(), callback)
        .add(nop())
        .buildAndSendWithAnchoring();

      await expect(promise).rejects.toThrow(AnchoringTimeoutError);

      expect(callback).toHaveBeenCalledWith(
        null,
        expect.any(AnchoringTimeoutError),
      );
    }, 5000);

    it("calls callback with an error and reject the promise if polling for system anchoring times out", async () => {
      (getBlockAnchoringTransaction as jest.Mock).mockReturnValueOnce({});
      (isBlockAnchored as jest.Mock)
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(null);

      const callback: jest.Mock<any, any, any> = jest.fn();
      const promise = transactionBuilder(
        createNoopAuthenticator(createFakeAuthDataService({})),
        client,
        {
          retryCount: 2,
          waitTimeMs: 1,
        },
      )
        .add(emptyOp(), callback)
        .add(nop())
        .buildAndSendWithAnchoring();

      await expect(promise).rejects.toThrow(AnchoringTimeoutError);

      expect(callback).toHaveBeenCalledWith(
        null,
        expect.any(AnchoringTimeoutError),
      );
    }, 5000);
  });
});
