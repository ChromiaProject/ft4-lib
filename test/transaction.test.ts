import BlockchainUtil from "./util/blockchain-util";
import MaliciousSignatureProvider from "./util/malicious-signature-provider";
import {
  FlagsType,
  Blockchain,
  Transaction,
  SingleSignatureAuthDescriptor,
  op,
} from "../client/lib/ft3";
import { gtv } from "postchain-client";

let blockchain: Blockchain;

describe("Blockchain", () => {
  beforeAll(async () => {
    blockchain = await BlockchainUtil.getDefaultBlockchain();
  });

  it("should successfully get the transaction ID", async () => {
    const tx = blockchain.transactionBuilder().add(op("foo", "bar")).build([]);

    const expectedTxRID = gtv.gtvHash([blockchain.id, [["foo", ["bar"]]], []]);

    expect(tx.getTxRID()).toEqual(expectedTxRID);
  });

  it("should fail if tx gets modified by signature provider", async () => {
    const signatureProvider = new MaliciousSignatureProvider();

    const authDescriptor = new SingleSignatureAuthDescriptor(
      signatureProvider.pubKey,
      [FlagsType.Account, FlagsType.Transfer]
    );

    const tx = blockchain
      .transactionBuilder()
      .add(op("ft3.dev_register_account", authDescriptor))
      .build([signatureProvider.pubKey]);

    await expect(tx.sign(signatureProvider)).rejects.toBeInstanceOf(Error);
  });

  it("should successfully build transactions with null and undefined arguments", async () => {
    const txBuilder = blockchain
      .transactionBuilder()
      .add(op("test_op_with_null_and_undefined_value", null, undefined));
    expect(() => {
      txBuilder.build([]);
    }).not.toThrow();
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
