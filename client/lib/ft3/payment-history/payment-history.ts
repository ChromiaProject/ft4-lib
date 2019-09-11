import ConnectionClient from "../connection-client";

export default class PaymentHistory {

    static async getByAccountId(id: Buffer, afterBlock: number = -1, connection: ConnectionClient): Promise<any[]> {
        return await connection.gtx.query(
            'ft3.get_payment_history',
            {
                account_id: id.toString('hex'),
                after_block: afterBlock
            }
        );
    }
}