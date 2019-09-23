import { gtx } from 'postchain-client'
import TransferOperation from "./payment-history/payment-operation/transfer-operation";
import XTransferOperation from "./payment-history/payment-operation/xtransfer-operation";
import PaymentOperation from "./payment-history/payment-operation/payment-operation";

export default class PaymentOperationExtractor {
    private readonly transaction: Buffer;
    private readonly chainId: string;

    constructor(rawTransaction: Buffer, chainId: string) {
        this.transaction = rawTransaction;
        this.chainId = chainId;
    }

    extract(): PaymentOperation[] {
        const transaction = gtx.deserialize(this.transaction);
        const transfers = transaction.operations.filter (({ opName }) =>
            opName === 'ft3.transfer' || opName === 'ft3.xc.init_xfer'
        );

        return transfers.map(transfer => {
            switch (transfer.opName) {
                case 'ft3.transfer':
                    return PaymentOperation.fromTransfer(TransferOperation.from(transfer), this.chainId);
                case 'ft3.xc.init_xfer':
                    return PaymentOperation.fromXTransfer(XTransferOperation.from(transfer), this.chainId);
                default: return null
            }

        }).filter(transfer => transfer);
    }
}