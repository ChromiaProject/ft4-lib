import { Buffer } from "buffer";
import { IClient, Operation, encryption, gtx } from "postchain-client";
import { transfer } from "/ft4/accounts/account-operations";
import {
  FlagsType,
  aggregateSigners,
  gtv,
  deriveAccountId,
} from "/ft4/accounts/auth-descriptor";
import { AnyAuthDescriptorRegistration } from "/ft4/accounts/auth-descriptor/types";
import { registerAccount } from "/ft4/admin/admin-operations";
import { createAuthenticator } from "/ft4/authentication";
import { createInMemoryFtKeyStore } from "/ft4/authentication/ft/key-stores/in-memory";
import {
  AuthDataService,
  Authenticator,
  KeyHandler,
} from "/ft4/authentication/types";
import { nop } from "/ft4/utils";
import {
  AuthorizationError,
  transactionBuilder,
} from "/ft4/utils/transaction-builder";
import { createChromiaClient } from "./util/blockchain-util";
import { createFakeAuthDataService } from "./util/fake-auth-data-service";
import { createTestAuthDescriptorRegistration } from "./util/util";
import { createAmount } from "/ft4/asset/amount";

describe("Transaction Builder", () => {
  let authenticator: Authenticator;
  let client: IClient;
  let authDescriptor: AnyAuthDescriptorRegistration;
  let keyHandler: KeyHandler;
  let authDataService: AuthDataService;

  const mockOperation: Operation = {
    name: "testOperation",
  };

  function setupTestEnvironment(
    exposureLogicFn?: (operationName: string) => Promise<boolean>,
  ) {
    const accountId = encryption.randomBytes(32);

    const { keyPair, authDescriptorRegistration: ad } =
      createTestAuthDescriptorRegistration([FlagsType.Transfer]);
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
        args: [authenticator.accountId, deriveAccountId(authDescriptor)],
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
      .add(registerAccount(gtv.authDescriptorRegistrationToGtv(authDescriptor)))
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
    const { authDescriptorRegistration, keyPair } =
      createTestAuthDescriptorRegistration([FlagsType.Account]);
    const keyHandlerMock: KeyHandler = {
      authDescriptorRegistration,
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
      getNonce: jest.fn().mockReturnValue(0),
    };
    await transactionBuilder(authenticator, client)
      .addWithAuthenticator(
        registerAccount(
          gtv.authDescriptorRegistrationToGtv(authDescriptorRegistration),
        ),
        authenticatorMock,
      )
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
});
