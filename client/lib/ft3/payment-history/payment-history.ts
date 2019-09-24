import ConnectionClient from "../connection-client";
import PaymentHistoryEntryShort from "./payment-history-entry-short";

export default class PaymentHistory {

    static async getByAccountId(id: Buffer, afterBlock: number = -1, connection: ConnectionClient): Promise<PaymentHistoryEntryShort[]> {
        const paymentHistoryEntries = await connection.gtx.query(
            'ft3.get_payment_history',
            {
                account_id: id.toString('hex'),
                after_block: afterBlock
            }
        );

        return paymentHistoryEntries.map(entry => PaymentHistoryEntryShort.from(entry));
    }
}