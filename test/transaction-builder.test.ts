import { encryption } from "postchain-client";
import { createTestAuthDescriptor } from "./util/util";
import { createInMemoryFTKeyStore } from "../client/lib/ft4/authentication/ft/key-stores/in-memory";
import { createFakeAuthDataService } from "./util/fake-auth-data-service";
import { createAuthenicator } from "../client/lib/ft4/authentication";
import {
  AuthorizationError,
  transactionBuilder,
} from "../client/lib/ft4/utils/transaction-builder";
import { createClient } from "./util/blockchain-util";
import { nop } from "../client/lib/ft4/utils";
import {
  Authenticator,
  KeyHandler,
} from "../client/lib/ft4/authentication/interfaces";
import { GtxClient } from "postchain-client/built/src/gtx/interfaces";
import { transferOp } from "../client/lib/ft4/accounts/account-operations";
import { XferInput, XferOutput } from "../client/lib/ft4/accounts/types";
import { AuthDescriptor } from "../client/lib/ft4/accounts/auth-descriptor/types";
import { FlagsType } from "../client/lib/ft4/accounts/auth-descriptor";
import { registerOp } from "../client/lib/ft4/accounts/account-dev-operations";

describe("Transaction Builder", () => {
  let authenticator: Authenticator;
  let client: GtxClient;
  let authDescriptor: AuthDescriptor;
  let keyHandler: KeyHandler;

  beforeEach(async () => {
    const accountId = encryption.randomBytes(32);
    const { keyPair, authDescriptor: ad } = createTestAuthDescriptor([
      FlagsType.Transfer,
    ]);
    authDescriptor = ad;

    keyHandler = createInMemoryFTKeyStore(keyPair).createKeyHandler(ad);
    const authDataService = createFakeAuthDataService({
      ["ft4.transfer"]: { flags: [FlagsType.Transfer], message: "" },
      ["ft4.admin.register_account"]: {
        flags: [FlagsType.Account],
        message: "",
      },
    });
    authenticator = createAuthenicator(
      accountId,
      [keyHandler],
      authDataService
    );

    client = await createClient();
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
      .add(transferOp([input], [output]))
      .buildUnsigned();

    const expectedInput: any = [...input];
    expectedInput[expectedInput.length - 1] = {};

    const expectedOutput: any = [...output];
    expectedOutput[expectedOutput.length - 1] = {};

    expect(tx.gtx.operations).toStrictEqual([
      {
        opName: "ft.ft_auth",
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
      .add(transferOp([input], [output]))
      .build();

    expect(tx.gtx.signers).toStrictEqual(authDescriptor.signers);
    expect(tx.gtx.signatures).toBeDefined();
  });

  it("can build transations with a nop", async () => {
    const operation = nop();
    const tx = await transactionBuilder(authenticator, client)
      .add(operation)
      .buildUnsigned();
    const [opName, ...args] = operation;
    expect(tx.gtx.operations).toStrictEqual([{ opName, args }]);
  });

  it("does not sign transaction with only a nop on build", async () => {
    const operation = nop();
    const tx = await transactionBuilder(authenticator, client)
      .add(operation)
      .build();
    expect(tx.gtx.signers).toStrictEqual([]);
    expect(tx.gtx.signatures).toStrictEqual(undefined);
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
    const operation = nop();
    const tx = await transactionBuilder(authenticator, client)
      .add(operation)
      .addSigners(keyHandler)
      .build();
    expect(tx.gtx.signers).toStrictEqual(keyHandler.getSigners());
    expect(tx.gtx.signatures).toBeDefined();
  });

  it("uses custom authenticator if provided", async () => {
    const { authDescriptor, keyPair } = createTestAuthDescriptor([
      FlagsType.Account,
    ]);
    const keyHandlerMock: KeyHandler = {
      authDescriptor,
      keyStore: createInMemoryFTKeyStore(keyPair),
      satisfiesAuthRequirements: jest.fn(),
      authenticate: jest
        .fn()
        .mockImplementation((accountId, operation) =>
          Promise.resolve(operation)
        ),
      sign: jest.fn(),
      getSigners: jest.fn(),
    };
    const authenticatorMock: Authenticator = {
      accountId: Buffer.alloc(32),
      keyHandlers: [keyHandlerMock],

      createSession: jest.fn(),
      getAuthRequirements: jest
        .fn()
        .mockReturnValue({ flags: [], message: "" }),
      getKeyHandlerForOperation: jest.fn().mockReturnValue(keyHandlerMock),
      getNonce: jest.fn(),
    };
    await transactionBuilder(authenticator, client)
      .addWithAuthenticator(registerOp(authDescriptor), authenticatorMock)
      .build();
    expect(keyHandlerMock.authenticate).toHaveBeenCalled();
    expect(keyHandlerMock.sign).toHaveBeenCalled();
  });
});
