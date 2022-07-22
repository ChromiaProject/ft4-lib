import Blockchain from "../client/lib/ft3/core/blockchain/blockchain";
import Transaction from "../client/lib/ft3/core/transaction";
import BlockchainUtil from "./util/blockchain-util";
import { gtv } from "postchain-client";
import { op } from "../client/lib/ft3";

let blockchain: Blockchain = null;

describe("Blockchain", () => {
  beforeAll(async () => {
    blockchain = await BlockchainUtil.getDefaultBlockchain();
  });

  it("should successfully get the transaction ID", async () => {
    const tx = blockchain.transactionBuilder().add(op("foo", "bar")).build([]);

    const expectedTxRID = gtv.gtvHash([blockchain.id, [["foo", ["bar"]]], []]);

    expect(tx.getTxRID()).toEqual(expectedTxRID);
  });

  it("should successfully send transactions with null arguments", async () => {
    const tx = blockchain
      .transactionBuilder()
      .add(op("test_this_with_null_value", null))
      .build([]);

    const promise = tx.post();

    await expect(promise).resolves.not.toThrowError();
  });

  it("should stop raw transactions intended for a different blockchain", async () => {
    const tx = blockchain
      .transactionBuilder()
      .add(op("foo", "bar"))
      .build([])
      .raw();

    const bc = BlockchainUtil.getNewBlockchain();

    expect(() => {
      Transaction.fromRawTransaction(tx, bc);
    }).toThrowError();
  });
});
