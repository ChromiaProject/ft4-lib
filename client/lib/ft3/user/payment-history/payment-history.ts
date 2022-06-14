import PaymentHistoryEntryShort from "./payment-history-entry-short";
import Blockchain from "../../core/blockchain/blockchain";

export default class PaymentHistory {
  static async getByAccountId(
    id: Buffer,
    afterBlock: number = -1,
    blockchain: Blockchain
  ): Promise<PaymentHistoryEntryShort[]> {
    const paymentHistoryEntries = await blockchain.query(
      "ft3.get_payment_history",
      {
        account_id: id.toString("hex"),
        after_block: afterBlock,
      }
    );

    return paymentHistoryEntries.map((entry) =>
      PaymentHistoryEntryShort.from(entry)
    );
  }
}
