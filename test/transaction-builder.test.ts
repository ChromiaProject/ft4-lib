import { createTestAuthDescriptor, emptyOp } from "./util/util";
import { createInMemoryFtKeyStore } from "/ft4/authentication/ft/key-stores/in-memory";
import { createFakeAuthDataService } from "./util/fake-auth-data-service";
import { createAuthenticator } from "/ft4/authentication";
import {
  AnchoringTimeoutError,
  AuthorizationError,
  transactionBuilder,
} from "/ft4/utils/transaction-builder";
import { createChromiaClient } from "./util/blockchain-util";
import { nop } from "/ft4/utils";
import {
  AuthDataService,
  Authenticator,
  KeyHandler,
} from "/ft4/authentication/types";
import {
  IClient,
  Operation,
  encryption,
  gtx,
  isBlockAnchored,
} from "postchain-client";
import { transfer } from "/ft4/accounts/account-operations";
import { AuthDescriptor } from "/ft4/accounts/auth-descriptor/types";
import { FlagsType } from "/ft4/accounts/auth-descriptor";
import { Buffer } from "buffer";
import { registerAccount } from "/ft4/admin/admin-operations";
import { createAmount } from "/ft4/asset/amount";

describe("Transaction Builder", () => {
  let authenticator: Authenticator;
  let client: IClient;
  let authDescriptor: AuthDescriptor;
  let keyHandler: KeyHandler;
  let authDataService: AuthDataService;

  const mockOperation: Operation = {
    name: "testOperation",
  };

  function setupTestEnvironment(
    exposureLogicFn?: (operationName: string) => Promise<boolean>,
  ) {
    const accountId = encryption.randomBytes(32);

    const { keyPair, authDescriptor: ad } = createTestAuthDescriptor([
      FlagsType.Transfer,
    ]);
    authDescriptor = ad;

    keyHandler = createInMemoryFtKeyStore(keyPair).createKeyHandler(ad);

    authDataService = createFakeAuthDataService(
      {
        ["ft4.transfer"]: { flags: [FlagsType.Transfer], message: "" },
        ["ft4.admin.register_account"]: {
          flags: [FlagsType.Account],
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
      FlagsType.Account,
    ]);
    const keyHandlerMock: KeyHandler = {
      authDescriptor,
      keyStore: createInMemoryFtKeyStore(keyPair),
      satisfiesAuthRequirements: jest.fn(),
      authorize: jest
        .fn()
        .mockImplementation((accountId, operation) =>
          Promise.resolve([operation]),
        ),
      sign: jest.fn(),
      getSigners: jest.fn(),
    };
    const authenticatorMock: Authenticator = {
      accountId: Buffer.alloc(32),
      keyHandlers: [keyHandlerMock],
      authDataService: createFakeAuthDataService({}),
      createSession: jest.fn(),
      getAuthFlags: jest.fn().mockReturnValue([]),
      getKeyHandlerForOperation: jest.fn().mockReturnValue(keyHandlerMock),
      getNonce: jest.fn(),
    };
    return { authenticatorMock, keyHandlerMock, keyPair, authDescriptor };
  }

  beforeEach(async () => {
    setupTestEnvironment();
    client = await createChromiaClient();
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

    expect(gtx.deserialize(tx).signers).toStrictEqual(authDescriptor.signers);
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

  it("does not sign transaction with only a nop on build", async () => {
    const operation = nop();
    const tx = await transactionBuilder(authenticator, client)
      .add(operation)
      .build();
    expect(gtx.deserialize(tx).signers).toStrictEqual([]);
    expect(gtx.deserialize(tx).signatures).toStrictEqual([]);
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
      .addSigners(keyHandler)
      .build();
    expect(gtx.deserialize(tx).signers).toStrictEqual(keyHandler.getSigners());
    expect(gtx.deserialize(tx).signatures).toBeDefined();
  });

  it("uses custom authenticator if provided", async () => {
    const { authenticatorMock, keyHandlerMock, authDescriptor } = getMocks();
    await transactionBuilder(authenticator, client)
      .addWithAuthenticator(registerAccount(authDescriptor), authenticatorMock)
      .build();
    expect(keyHandlerMock.authorize).toHaveBeenCalled();
    expect(keyHandlerMock.sign).toHaveBeenCalled();
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

  describe("block anchored handling", () => {
    it("can build and submit a function", async () => {
      const { authenticatorMock } = getMocks();
      await expect(
        transactionBuilder(authenticatorMock, client)
          .add(emptyOp())
          .add(nop())
          .buildAndSend(),
      ).resolves.toMatchObject({
        status: "confirmed",
        statusCode: 200,
      });
    });

    it("calls registered handler when block is anchored", async () => {
      (isBlockAnchored as jest.Mock).mockReturnValueOnce(true);
      const { authenticatorMock } = getMocks();
      let callback = null;
      const promise = new Promise((resolve) => {
        transactionBuilder(authenticatorMock, client)
          .add(
            emptyOp(),
            (callback = jest.fn().mockImplementation((op) => resolve(op))),
          )
          .add(nop())
          .buildAndSend();
      });
      await promise;

      expect(callback).toHaveBeenCalledWith(emptyOp(), null);
    });

    it("calls all registered handler when block is anchored", async () => {
      (isBlockAnchored as jest.Mock).mockReturnValueOnce(true);
      const { authenticatorMock } = getMocks();
      let callback = null;
      let callback2 = null;
      const promise = new Promise((resolve) => {
        transactionBuilder(authenticatorMock, client)
          .add(
            emptyOp(),
            (callback = jest.fn().mockImplementation((op) => resolve(op))),
          )
          .add(
            emptyOp(),
            (callback2 = jest.fn().mockImplementation((op) => resolve(op))),
          )
          .add(nop())
          .buildAndSend();
      });
      await promise;

      expect(callback).toHaveBeenCalledWith(emptyOp(), null);
      expect(callback2).toHaveBeenCalledWith(emptyOp(), null);
    });

    it("calls callbacks even if block is not anchored immediately", async () => {
      (isBlockAnchored as any)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);
      const { authenticatorMock } = getMocks();
      let callback = null;
      const promise = new Promise((resolve) => {
        transactionBuilder(authenticatorMock, client)
          .add(
            emptyOp(),
            (callback = jest.fn().mockImplementation((op) => resolve(op))),
          )
          .add(nop())
          .buildAndSend();
      });
      await promise;

      expect(callback).toHaveBeenCalledWith(emptyOp(), null);
    });
    it("calls callback with an error if polling times out", async () => {
      (isBlockAnchored as any)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false);
      const { authenticatorMock } = getMocks();
      let callback = null;
      const promise = new Promise((resolve) => {
        transactionBuilder(authenticatorMock, client, {
          retryCount: 2,
          waitTimeMs: 1,
        })
          .add(
            emptyOp(),
            (callback = jest.fn().mockImplementation((op) => resolve(op))),
          )
          .add(nop())
          .buildAndSend();
      });
      await promise;

      expect(callback).toHaveBeenCalledWith(
        null,
        expect.any(AnchoringTimeoutError),
      );
    });
    it("returns reciept without waiting for block to be anchored", async () => {
      const { authenticatorMock } = getMocks();
      //eslint-disable-next-line no-async-promise-executor
      const promise = new Promise(async (resolve) => {
        const receipt = await transactionBuilder(authenticatorMock, client, {
          retryCount: 2,
          waitTimeMs: 1,
        })
          .add(
            emptyOp(),
            jest.fn().mockImplementation((op) => resolve(op)),
          )
          .add(nop())
          .buildAndSend();
        expect(receipt).toMatchObject({ status: "confirmed" });
      });
      await promise;
    });
  });
});
