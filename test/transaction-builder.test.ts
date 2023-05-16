import { encryption } from "postchain-client";
import { createTestAuthDescriptor } from "/util/util";
import { createInMemoryFTKeyStore } from "/ft3/authentication/ft/key-stores/in-memory";
import { createFakeAuthDataService } from "/util/fake-auth-data-service";
import { createAuthenicator } from "/ft3/authentication";
import {
  AuthorizationError,
  transactionBuilder,
} from "/ft3/utils/transaction-builder";
import { createClient } from "/util/blockchain-util";
import { nop } from "/ft3/utils";
import { Authenticator, KeyHandler } from "/ft3/authentication/interfaces";
import { GtxClient } from "postchain-client/built/src/gtx/interfaces";
import { transferOp } from "/ft3/account/account-operations";
import { XferInput, XferOutput } from "/ft3/account/types";
import { AuthDescriptor } from "/ft3/account/auth-descriptor/types";
import { FlagsType } from "/ft3/account/auth-descriptor";
import { registerOp } from "/ft3/account/account-dev-operations";

describe("Transaction Builder", () => {
  let authenticator: Authenticator = null;
  let client: GtxClient = null;
  let authDescriptor: AuthDescriptor = null;
  let keyHandler: KeyHandler = null;

  beforeEach(async () => {
    const accountId = encryption.randomBytes(32);
    const { keyPair, authDescriptor: ad } = createTestAuthDescriptor([
      FlagsType.Transfer,
    ]);
    authDescriptor = ad;

    keyHandler = createInMemoryFTKeyStore(keyPair).createKeyHandler(ad);
    const authDataService = createFakeAuthDataService({
      ["ft3.transfer"]: { flags: [FlagsType.Transfer] },
      ["ft3.dev_register_account"]: { flags: [FlagsType.Account] },
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
    expectedInput[expectedInput.length - 1] = [];

    const expectedOutput: any = [...output];
    expectedOutput[expectedOutput.length - 1] = [];

    expect(tx.gtx.operations).toStrictEqual([
      {
        opName: "ft.ft_auth",
        args: [authenticator.accountId, authDescriptor.id],
      },
      { opName: "ft3.transfer", args: [[expectedInput], [expectedOutput]] },
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
    expect(tx.gtx.signers).toStrictEqual([keyHandler.keyStore.pubKey]);
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
    };
    const authenticatorMock: Authenticator = {
      accountId: Buffer.alloc(32),
      keyHandlers: [keyHandlerMock],

      createSession: jest.fn(),
      getAuthRequirements: jest.fn(),
      getKeyHandlerForOperation: jest.fn().mockReturnValue(keyHandlerMock),
    };
    await transactionBuilder(authenticator, client)
      .addWithAuthenticator(registerOp(authDescriptor), authenticatorMock)
      .build();
    expect(keyHandlerMock.authenticate).toHaveBeenCalled();
    expect(keyHandlerMock.sign).toHaveBeenCalled();
  });
});
