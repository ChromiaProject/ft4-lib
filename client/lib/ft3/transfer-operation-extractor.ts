import { gtx } from 'postchain-client'
import TransferOperation from "./payment-history/payment-operation/transfer-operation";

export default class TransferOperationExtractor {
    private transaction: Buffer;

    constructor(rawTransaction: Buffer) {
        this.transaction = rawTransaction;
    }

    extract(): TransferOperation[] {
        const transaction = gtx.deserialize(this.transaction);
        const transfers = transaction.operations.filter (({ opName }) => opName === 'ft3.transfer' || opName === 'ft3.xc.init_xfer');

        return transfers.map(transfer => TransferOperation.from(transfer));
    }
}