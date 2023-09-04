import { createClient } from "postchain-client";
import { fetchBlockchains } from "/__multichain__/util/blockchain";
import { createAmount } from "/ft4";
import { createOrchestrator } from "/ft4/crosschain/orchestrator";

describe("Orchestrator", () => {
  let client: any;
  let authenticator: any;
  let connection: any;
  const recipientId = Buffer.from("recipientId");
  const amount = createAmount(100, 1);
  const assetId = Buffer.from("assetId");
  const path: Buffer[] = [Buffer.from("bridB"), Buffer.from("bridC")];

  beforeEach(async () => {
    const { multichain00 } = await fetchBlockchains();

    client = await createClient({
      nodeURLPool: "http://127.0.0.1:7740",
      blockchainRID: multichain00.rid.toString("hex"),
    });

    // TODO: initialize your authenticator and connection here.
    // This is a mock and should be replaced with the actual implementation
    authenticator = {
      /* ... */
    };
    connection = { client };
  });

  it("should execute transfer through all paths", async () => {
    const orchestrator = createOrchestrator(
      recipientId,
      amount,
      assetId,
      path,
      authenticator,
      connection,
    );

    const initListener = jest.fn();
    const hopListener = jest.fn();
    const endListener = jest.fn();

    orchestrator.onTransferInit(initListener);
    orchestrator.onTransferHop(hopListener);
    orchestrator.onTransferEnd(endListener);

    await orchestrator.transfer();

    expect(initListener).toHaveBeenCalledWith(path[0]);
    expect(hopListener).toHaveBeenCalledTimes(path.length);
    path.forEach((brid, index) => {
      expect(hopListener).toHaveBeenNthCalledWith(index + 1, brid);
    });
    expect(endListener).toHaveBeenCalled();
  });

  it("should emit error event on failure", async () => {
    // This is a mock to induce an error in the transfer
    // Replace this with the actual implementation to simulate an error
    jest.mock("/ft4/utils/transaction-builder", () => {
      return {
        transactionBuilder: () => {
          throw new Error("Mocked Error");
        },
      };
    });

    const orchestrator = createOrchestrator(
      recipientId,
      amount,
      assetId,
      path,
      authenticator,
      connection,
    );
    const errorListener = jest.fn();

    orchestrator.onTransferError(errorListener);

    await orchestrator.transfer();

    expect(errorListener).toHaveBeenCalled();
  });
});
