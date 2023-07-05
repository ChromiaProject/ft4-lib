import { createTestAuthDescriptor } from "./util/util";
import { createInMemoryFtKeyStore } from "../client/lib/ft4/authentication/ft/key-stores/in-memory";
import { createFakeAuthDataService } from "./util/fake-auth-data-service";
import { createAuthenticator } from "../client/lib/ft4/authentication";
import {
  AuthorizationError,
  transactionBuilder,
} from "../client/lib/ft4/utils/transaction-builder";
import { createChromiaClient } from "./util/blockchain-util";
import { _nop } from "../client/lib/ft4/utils";
import {
  Authenticator,
  KeyHandler,
} from "../client/lib/ft4/authentication/types";
import { IClient, encryption, gtx } from "postchain-client";
import { _transferOp } from "../client/lib/ft4/accounts/account-operations";
import { XferInput, XferOutput } from "../client/lib/ft4/accounts/types";
import { AuthDescriptor } from "../client/lib/ft4/accounts/auth-descriptor/types";
import { FlagsType } from "../client/lib/ft4/accounts/auth-descriptor";
import { Buffer } from "buffer";
import { registerOp } from "/ft4/accounts/account-dev-operations";

describe("Transaction Builder", () => {
  let authenticator: Authenticator;
  let client: IClient;
  let authDescriptor: AuthDescriptor;
  let keyHandler: KeyHandler;

  beforeEach(async () => {
    const accountId = encryption.randomBytes(32);
    const { keyPair, authDescriptor: ad } = createTestAuthDescriptor([
      FlagsType.Transfer,
    ]);
    authDescriptor = ad;

    keyHandler = createInMemoryFtKeyStore(keyPair).createKeyHandler(ad);
    const authDataService = createFakeAuthDataService({
      ["ft4.transfer"]: { flags: [FlagsType.Transfer], message: "" },
      ["ft4.admin.register_account"]: {
        flags: [FlagsType.Account],
        message: "",
      },
    });
    authenticator = createAuthenticator(
      accountId,
      [keyHandler],
      authDataService
    );

    client = await createChromiaClient();
  });

  it("builds an unsigned transaction", async () => {
    const input: XferInput = [
      authenticator.accountId,
      Buffer.alloc(32),
      authDescriptor.id,
      BigInt(10),
      {},
    ];
    const output: XferOutput = [
      Buffer.alloc(32),
      Buffer.alloc(32),
      BigInt(10),
      {},
    ];

    const tx = await transactionBuilder(authenticator, client)
      .add(_transferOp([input], [output]))
      .buildUnsigned();

    const expectedInput: any = [...input];
    expectedInput[expectedInput.length - 1] = {};

    const expectedOutput: any = [...output];
    expectedOutput[expectedOutput.length - 1] = {};

    expect(tx.operations).toStrictEqual([
      {
        opName: "ft4.ft_auth",
        args: [authenticator.accountId, authDescriptor.id],
      },
      { opName: "ft4.transfer", args: [[expectedInput], [expectedOutput]] },
    ]);
  });

  it("signs the transaction on build", async () => {
    const input: XferInput = [
      authenticator.accountId,
      Buffer.alloc(32),
      authDescriptor.id,
      BigInt(10),
      {},
    ];
    const output: XferOutput = [
      Buffer.alloc(32),
      Buffer.alloc(32),
      BigInt(10),
      {},
    ];

    const tx = await transactionBuilder(authenticator, client)
      .add(_transferOp([input], [output]))
      .build();

    expect(gtx.deserialize(tx).signers).toStrictEqual(authDescriptor.signers);
    expect(gtx.deserialize(tx).signatures).toBeDefined();
  });

  it("can build transactions with a nop", async () => {
    const operation = _nop();
    const tx = await transactionBuilder(authenticator, client)
      .add(operation)
      .buildUnsigned();
    const { name, args } = operation;
    expect(tx.operations).toStrictEqual([{ opName: name, args }]);
  });

  it("does not sign transaction with only a nop on build", async () => {
    const operation = _nop();
    const tx = await transactionBuilder(authenticator, client)
      .add(operation)
      .build();
    expect(gtx.deserialize(tx).signers).toStrictEqual([]);
    expect(gtx.deserialize(tx).signatures).toStrictEqual([]);
  });

  it("throws an error if not sufficient permissions", async () => {
    try {
      await transactionBuilder(authenticator, client)
        .add(registerOp(authDescriptor))
        .buildUnsigned();
    } catch (e) {
      expect(e instanceof AuthorizationError).toBe(true);
    }
  });

  it("uses additional signers provided", async () => {
    const operation = _nop();
    const tx = await transactionBuilder(authenticator, client)
      .add(operation)
      .addSigners(keyHandler)
      .build();
    expect(gtx.deserialize(tx).signers).toStrictEqual(keyHandler.getSigners());
    expect(gtx.deserialize(tx).signatures).toBeDefined();
  });

  it("uses custom authenticator if provided", async () => {
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
          Promise.resolve([operation])
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
    await transactionBuilder(authenticator, client)
      .addWithAuthenticator(registerOp(authDescriptor), authenticatorMock)
      .build();
    expect(keyHandlerMock.authorize).toHaveBeenCalled();
    expect(keyHandlerMock.sign).toHaveBeenCalled();
  });
});
