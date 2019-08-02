import { gtv, gtx } from 'postchain-client';
import PaymentHistory from "./payment-history";
import ConnectionClient from "../connection-client";
import PaymentHistoryStoreLocalStorage from "./payment-history-store-local-storage";
import PaymentHistoryEntry from "./payment-history-entry";
import PaymentHistoryStore from "./payment-history-store";

class LocalStorageMock {

    store = {};

    clear() {
        this.store = {};
    }

    getItem(key) {
        return this.store[key] || null;
    }

    setItem(key, value) {
        this.store[key] = value.toString();
    }

    removeItem(key) {
        delete this.store[key];
    }
}

const localStorage = new LocalStorageMock();

export default class PaymentHistorySyncManager {
    readonly paymentHistoryStore: PaymentHistoryStore = new PaymentHistoryStoreLocalStorage();

    async syncAccount(id: Buffer, connection: ConnectionClient) {
        const syncInfo = this.getAccountSyncInfo(id);
        const lastBlock = +syncInfo.lastBlock || -1;

        const paymentHistory = await PaymentHistory.getByAccountId(id, lastBlock, connection);

        if (paymentHistory.length === 0) { return }

        const paymentHistoryEntries = paymentHistory.map(entry => this.mapToPaymentHistoryEntry(entry)).reverse();

        const newLastBlock = paymentHistoryEntries
            .map(({ blockHeight}) => blockHeight)
            .reduce((x, y) => Math.max(x, y), lastBlock);

        this.paymentHistoryStore.save(id, paymentHistoryEntries);

        syncInfo.lastBlock = newLastBlock;

        this.storeAccountSyncInfo(id, syncInfo);
    }

    private getAccountSyncInfo(id: Buffer): any {
        const key = `FT3_LIB_P_H_S_I_${id.toString('hex').toUpperCase()}`;
        const value = localStorage.getItem(key);
        return (value && JSON.parse(value)) || {}
    }

    private storeAccountSyncInfo(id: Buffer, syncInfo: any) {
        const key = `FT3_LIB_P_H_S_I_${id.toString('hex').toUpperCase()}`;
        localStorage.setItem(key, JSON.stringify(syncInfo));
    }

    private mapToPaymentHistoryEntry(entry: any): PaymentHistoryEntry {

        const params = this.getInputsAndOutputs(entry.tx_data);

        const other = (entry.is_input === 1 ? params.outputs : params.inputs)
            .filter(({ assetId }) => assetId.toUpperCase() === entry.asset_id)
            .map(({ accountId }) => ({ accountId }));

        return new PaymentHistoryEntry(
            entry.is_input === 1,
            entry.delta,
            entry.asset,
            Buffer.from(entry.asset_id, 'hex'),
            other,
            new Date(entry.timestamp),
            Buffer.from(entry.tx_rid, 'hex'),
            entry.block_height
        );
    }

    private getInputsAndOutputs(rawTransaction: string): any {
        const transaction = gtx.deserialize(Buffer.from(rawTransaction, 'hex'));
        const transfers = transaction.operations.filter (({ opName }) => opName === 'ft3.transfer');

        if (transfers.lenght === 0) { throw new Error('Transfer operations not found in the transaction') }

        const inputs = transfers[0].args[0].map(input => ({ accountId: input[0], assetId: input[1], amount: input[3]}));
        const outputs = transfers[0].args[1].map(output => ({ accountId: output[0], assetId: output[1], amount: output[2]}));
        return { inputs, outputs };
    }
}
