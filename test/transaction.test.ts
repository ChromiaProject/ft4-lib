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

  it("should send transactions with null and undefined values", async () => {
    const tx = blockchain
      .transactionBuilder()
      .add(op("nullable", null))
      .add(op("nullable", undefined))
      .build([])
      .post();

    await expect(tx).resolves.not.toThrow();
  });
});
