import { Buffer } from "buffer";
import { IClient, KeyPair, Operation, encryption, gtx } from "postchain-client";
import { createStubClient } from "../util/blockchain-util";
import { createFakeAuthDataService } from "../util/fake-auth-data-service";
import { createTestAuthDescriptor, emptyOp } from "../util/util";
import { transfer } from "@ft4/accounts/account-operations";
import {
  FlagsType,
  aggregateSigners,
  deriveAuthDescriptorId,
} from "@ft4/accounts/auth-descriptor";
import { AnyAuthDescriptor } from "@ft4/accounts/auth-descriptor/types";
import { registerAccount } from "@ft4/admin/admin-operations";
import { createAmount } from "@ft4/asset/amount";
import {
  AuthDataService,
  Authenticator,
  FtKeyStore,
  KeyHandler,
  createAuthenticator,
  createNoopAuthenticator,
} from "@ft4/authentication";
import { createInMemoryFtKeyStore } from "@ft4/authentication/ft/key-stores/in-memory";
import { nop } from "@ft4/utils";
import {
  AuthorizationError,
  transactionBuilder,
} from "@ft4/utils/transaction-builder";

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
      FlagsType.Transfer,
    ]);
    authDescriptor = ad;
    keyPair = pair;

    keyHandler =
      createInMemoryFtKeyStore(keyPair).createKeyHandler(authDescriptor);

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
  });

  it("builds an unsigned transaction", async () => {
    const args = [Buffer.alloc(32), Buffer.alloc(32), BigInt(10)] as const;
    const tx = await transactionBuilder(authenticator, client)
      .add(transfer(args[0], args[1], createAmount(args[2].toString(), 0)))
      .buildUnsigned();

    expect(tx.operations).toStrictEqual([
      {
        opName: "ft4.ft_auth",
        args: [authenticator.accountId, deriveAuthDescriptorId(authDescriptor)],
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

    const expectedTx = gtx.deserialize(
      await client.signTransaction(
        {
          operations: [
            {
              name: "ft4.ft_auth",
              args: [
                authenticator.accountId,
                deriveAuthDescriptorId(authDescriptor),
              ],
            },
            { name: mockOperation.name, args: undefined },
          ],
          signers: [keyPair.pubKey!],
        },
        keyPair,
      ),
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

  it("can build and submit a transaction", async () => {
    const { authenticatorMock, keyPair } = getMocks();
    const operation = nop();
    const expectedTx = client.encodeTransaction({
      operations: [emptyOp(), operation],
      signers: [keyPair.pubKey],
    });

    const originalSendTransaction = client.sendTransaction;
    try {
      client.sendTransaction = jest.fn().mockReturnValue(
        Promise.resolve({
          status: "confirmed",
          statusCode: 200,
          transactionRid: Buffer.alloc(32),
        }),
      );

      const { tx } = await transactionBuilder(authenticatorMock, client)
        .add(emptyOp())
        .add(operation)
        .buildAndSend();

      expect(gtx.deserialize(tx)).toMatchObject({
        ...gtx.deserialize(expectedTx),
        signatures: expect.arrayContaining([]),
      });
    } finally {
      client.sendTransaction = originalSendTransaction;
    }
  });
});
