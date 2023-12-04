import { createTestAuthDescriptor, emptyOp } from "../util/util";
import { createInMemoryFtKeyStore } from "/ft4/authentication/ft/key-stores/in-memory";
import { createFakeAuthDataService } from "../util/fake-auth-data-service";
import {
  AnchoringTimeoutError,
  transactionBuilder,
} from "/ft4/utils/transaction-builder";
import {
  anchoredHandlerCallbackParameters,
  createChromiaClient,
} from "../util/blockchain-util";
import { nop } from "/ft4/utils";
import { Authenticator, KeyHandler } from "/ft4/authentication/types";
import { IClient, gtx, isBlockAnchored } from "postchain-client";
import { FlagsType } from "/ft4/accounts/auth-descriptor";
import { Buffer } from "buffer";

describe("Transaction Builder", () => {
  let client: IClient;

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
      getKeyHandlerForOperation: jest.fn().mockReturnValue(keyHandlerMock),
      getNonce: jest.fn(),
    };
    return { authenticatorMock, keyHandlerMock, keyPair, authDescriptor };
  }

  beforeEach(async () => {
    client = await createChromiaClient();
  });

  it("can build and submit a function", async () => {
    const { authenticatorMock } = getMocks();
    const operation = nop();
    const expectedTx = client.encodeTransaction({
      operations: [emptyOp(), operation],
      signers: [],
    });

    const { tx } = await transactionBuilder(authenticatorMock, client)
      .add(emptyOp())
      .add(operation)
      .buildAndSend();

    expect(gtx.deserialize(tx)).toEqual(gtx.deserialize(expectedTx));
  });

  describe("block anchored handling", () => {
    it("calls registered handler when block is anchored", async () => {
      (isBlockAnchored as jest.Mock).mockReturnValueOnce(true);
      const { authenticatorMock } = getMocks();
      const operation = nop();
      let callback = null;
      const promise = new Promise((resolve) => {
        transactionBuilder(authenticatorMock, client)
          .add(
            emptyOp(),
            (callback = jest.fn().mockImplementation((op) => resolve(op))),
          )
          .add(operation)
          .buildAndSend();
      });
      await promise;

      expect(callback).toHaveBeenCalledWith(
        anchoredHandlerCallbackParameters(client, [emptyOp(), operation], 0),
        null,
      );
    });

    it("calls all registered handler when block is anchored", async () => {
      (isBlockAnchored as jest.Mock).mockReturnValueOnce(true);
      const { authenticatorMock } = getMocks();
      const operation = nop();
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
          .add(operation)
          .buildAndSend();
      });
      await promise;

      expect(callback).toHaveBeenCalledWith(
        anchoredHandlerCallbackParameters(
          client,
          [emptyOp(), emptyOp(), operation],
          0,
        ),
        null,
      );
      expect(callback2).toHaveBeenCalledWith(
        anchoredHandlerCallbackParameters(
          client,
          [emptyOp(), emptyOp(), operation],
          1,
        ),
        null,
      );
    });

    it("calls callbacks even if block is not anchored immediately", async () => {
      (isBlockAnchored as any)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);
      const { authenticatorMock } = getMocks();
      const operation = nop();
      let callback = null;
      const promise = new Promise((resolve) => {
        transactionBuilder(authenticatorMock, client)
          .add(
            emptyOp(),
            (callback = jest.fn().mockImplementation((op) => resolve(op))),
          )
          .add(operation)
          .buildAndSend();
      });
      await promise;

      expect(callback).toHaveBeenCalledWith(
        anchoredHandlerCallbackParameters(client, [emptyOp(), operation], 0),
        null,
      );
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

    it("returns receipt without waiting for block to be anchored", async () => {
      const { authenticatorMock } = getMocks();
      //eslint-disable-next-line no-async-promise-executor
      const promise = new Promise(async (resolve) => {
        const txInfo = await transactionBuilder(authenticatorMock, client, {
          retryCount: 2,
          waitTimeMs: 1,
        })
          .add(
            emptyOp(),
            jest.fn().mockImplementation((op) => resolve(op)),
          )
          .add(nop())
          .buildAndSend();
        expect(txInfo.receipt).toMatchObject({ status: "confirmed" });
      });
      await promise;
    });
  });
});
