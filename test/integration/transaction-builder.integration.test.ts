import { useChromiaNode } from "@ft4/util/chromia-node";
import { nop } from "@ft4/utils";
import {
  AnchoringTimeoutError,
  transactionBuilder,
} from "@ft4/utils/transaction-builder";
import { IClient, isBlockAnchored } from "postchain-client";
import { anchoredHandlerCallbackParameters } from "../util/blockchain-util";
import { createFakeAuthDataService } from "../util/fake-auth-data-service";
import { emptyOp } from "../util/util";
import { createNoopAuthenticator } from "@ft4/authentication/noop";

describe("Transaction Builder", () => {
  let client: IClient;

  const getClient = useChromiaNode();

  beforeEach(async () => {
    client = getClient();
  });

  describe("block anchored handling", () => {
    it("calls registered handler when block is anchored", async () => {
      (isBlockAnchored as jest.Mock).mockReturnValueOnce(true);
      const operation = nop();
      let callback: jest.Mock<any, any, any> = jest.fn();
      const promise = new Promise((resolve) => {
        transactionBuilder(
          createNoopAuthenticator(createFakeAuthDataService({})),
          client,
        )
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
    }, 10000);

    it("calls all registered handler when block is anchored", async () => {
      (isBlockAnchored as jest.Mock).mockReturnValueOnce(true);
      const operation = nop();
      let callback: jest.Mock<any, any, any> = jest.fn();
      let callback2: jest.Mock<any, any, any> = jest.fn();
      const promise = new Promise((resolve) => {
        transactionBuilder(
          createNoopAuthenticator(createFakeAuthDataService({})),
          client,
        )
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
    }, 10000);

    it("calls callbacks even if block is not anchored immediately", async () => {
      (isBlockAnchored as any)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);

      const operation = nop();
      let callback: jest.Mock<any, any, any> = jest.fn();
      const promise = new Promise((resolve) => {
        transactionBuilder(
          createNoopAuthenticator(createFakeAuthDataService({})),
          client,
        )
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
    }, 10000);

    it("calls callback with an error if polling times out", async () => {
      (isBlockAnchored as any)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false);

      let callback: jest.Mock<any, any, any> = jest.fn();
      const promise = new Promise((resolve) => {
        transactionBuilder(
          createNoopAuthenticator(createFakeAuthDataService({})),
          client,
          {
            retryCount: 2,
            waitTimeMs: 1,
          },
        )
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
    }, 10000);

    it("returns receipt without waiting for block to be anchored", async () => {
      //eslint-disable-next-line no-async-promise-executor
      const promise = new Promise(async (resolve) => {
        const txInfo = await transactionBuilder(
          createNoopAuthenticator(createFakeAuthDataService({})),
          client,
          {
            retryCount: 2,
            waitTimeMs: 1,
          },
        )
          .add(
            emptyOp(),
            jest.fn().mockImplementation((op) => resolve(op)),
          )
          .add(nop())
          .buildAndSend();
        expect(txInfo.receipt).toMatchObject({ status: "confirmed" });
      });
      await promise;
    }, 10000);
  });
});
