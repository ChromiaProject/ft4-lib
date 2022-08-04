import Blockchain from "../client/lib/ft3/core/blockchain/blockchain";
import Transaction from "../client/lib/ft3/core/transaction";
import BlockchainUtil from "./util/blockchain-util";
import MaliciousSignatureProvider from "./util/malicious-signature-provider";
import SingleSignatureAuthDescriptor from "../client/lib/ft3/user/auth-descriptor/single-signature-auth-descriptor";
import { FlagsType } from "../client/lib/ft3/user/account-utils";
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
