import { gtv, gtx } from 'postchain-client';
import PaymentHistory from "./payment-history";
import PaymentHistoryStoreLocalStorage from "./payment-history-store-local-storage";
import PaymentHistoryEntry from "./payment-history-entry";
import PaymentHistoryStore from "./payment-history-store";
import Blockchain from "../blockchain";
import PaymentHistoryEntryShort from "./payment-history-entry-short";
import TransferOperationExtractor from "../transfer-operation-extractor";
import TransferParam from './payment-operation/transfer-param';
import TransferOperation from "./payment-operation/transfer-operation";

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

    async syncAccount(id: Buffer, blockchain: Blockchain) {
        const syncInfo = this.getAccountSyncInfo(id);
        const lastBlock = +syncInfo.lastBlock || -1;

        const paymentHistory = await PaymentHistory.getByAccountId(id, lastBlock, blockchain.connection);
        if (paymentHistory.length === 0) { return }

        const paymentHistoryEntries = this.mapToPaymentHistoryEntries(paymentHistory, blockchain.id, id).reverse();
        this.paymentHistoryStore.save(id, paymentHistoryEntries);
        syncInfo.lastBlock = this.getHighestBlock(paymentHistoryEntries, lastBlock);
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

    private mapToPaymentHistoryEntries(rawEntries: PaymentHistoryEntryShort[], chainId: Buffer, accountId: Buffer): PaymentHistoryEntry[] {
        const entriesMap = this.groupRawEntriesByTransactionRID(rawEntries);
        const paymentHistoryEntries: PaymentHistoryEntry[][] = [];

        for (const entries of entriesMap.values()) {
            paymentHistoryEntries.push(this.paymentHistoryEntriesFrom(entries, chainId, accountId));
        }

        return paymentHistoryEntries.flat()
    }

    private groupRawEntriesByTransactionRID(entries: PaymentHistoryEntryShort[]): Map<string, any[]> {
        const entriesGroups: Map<string, PaymentHistoryEntryShort[]> = new Map<string, PaymentHistoryEntryShort[]>();
        entries.forEach(entry => {
            if (entriesGroups.has(entry.transactionId)) {
                entriesGroups.get(entry.transactionId).push(entry);
            } else {
                entriesGroups.set(entry.transactionId, [entry]);
            }
        });
        return entriesGroups;
    }

    private paymentHistoryEntriesFrom(entries: PaymentHistoryEntryShort[], chainId: Buffer, accountId: Buffer): PaymentHistoryEntry[] {
        if (entries.length === 0) { return [] }

        const [firstEntry] = entries;

        // Get all the transfers from the transaction which are related to the current account,
        // and then get all inputs and outputs for which current account is source or destination.
        const transfers = this.getTransfersForAccountFromRawTransaction(accountId, firstEntry.transactionData);

        let inputs = transfers
            .map(transfer => transfer.inputsWithAccount(accountId.toString('hex')))
            .flat();

        let outputs = transfers
            .map(transfer => transfer.outputsWithAccount(accountId.toString('hex')))
            .flat();

        //TODO: investigate if this check has to be removed, because lib might me used with new FT3 contract which
        //maybe has new transfer type, which adds payment history entries, but transfer is not supported by this version
        //of the client lib and it will not be loaded, and in the and number of inputs and outputs will not match
        //number of entries, and therefore exception will be thrown.
        if ((inputs.length + outputs.length) !== entries.length) {
            throw new Error(`Number of payment entries (${
                entries.length
            }) and number of transfer inputs and outputs (${
                inputs.length + outputs.length
            }) with address (${
                accountId.toString('hex')
            }) in the transaction are not the same`);
        }

        const paymentHistoryEntries: PaymentHistoryEntry[] = [];

        // In payment history entries returned from blockchain, there is no info about receiver for sent transfers
        // and sender for received transfers. In order to get sender/receiver info, we have to match payment history
        // entries to corresponding inputs and outputs extracted in previous step,
        // and then get sender/receiver from corresponding transfers.
        for (const entry of entries) {
            if (entry.isInput) {
                const input = this.matchPaymentHistoryEntryAndTransferParam(entry, inputs, accountId);
                if (!input) { throw new Error('Cannot match payment history entry to any transfer input') }
                inputs = inputs.filter(i => i !== input);
                paymentHistoryEntries.push(this.getPaymentHistoryEntry(entry, transfers, input, chainId.toString('hex')));
            } else {
                const output = this.matchPaymentHistoryEntryAndTransferParam(entry, outputs, accountId);
                if (!output) { throw new Error('Cannot match payment history entry to any transfer output') }
                outputs = outputs.filter(o => o !== output);
                paymentHistoryEntries.push(this.getPaymentHistoryEntry(entry, transfers, output, chainId.toString('hex')));
            }
        }

        return paymentHistoryEntries
    }

    private matchPaymentHistoryEntryAndTransferParam(entry: PaymentHistoryEntryShort, params: TransferParam[], accountId: Buffer): TransferParam {
        return params.find(param => (
            param.isAccountId(accountId.toString('hex')) &&
            param.isAssetId(entry.assetId) &&
            param.amount === entry.delta
            //TODO: compare entry index
        ))
    }

    private getPaymentHistoryEntry(
        entry: PaymentHistoryEntryShort,
        transfers: TransferOperation[],
        param: TransferParam,
        chainIdString: string
    ): PaymentHistoryEntry {
        const transfer
            = entry.isInput
            ? transfers.find(transfer => transfer.inputs.some(input => input === param))
            : transfers.find(transfer => transfer.outputs.some(output => output === param));

        const other
            = entry.isInput
            ? transfer.outputsWithAsset(entry.assetId).map(({ accountId }) => ({ accountId }))
            : transfer.inputsWithAsset(entry.assetId).map(({ accountId }) => ({ accountId }))

        return new PaymentHistoryEntry(
            entry.isInput,
            entry.delta,
            entry.asset,
            Buffer.from(entry.assetId, 'hex'),
            Buffer.from(chainIdString, 'hex'),
            other,
            new Date(entry.timestamp),
            Buffer.from(entry.transactionId, 'hex'),
            entry.blockHeight
        );
    }

    private getHighestBlock(entries: PaymentHistoryEntry[], lastBlock: number): number {
        return entries
            .map(({ blockHeight}) => blockHeight)
            .reduce((x, y) => Math.max(x, y), lastBlock);
    }

    private getTransfersForAccountFromRawTransaction(accountId: Buffer, transactionData: Buffer): TransferOperation[] {
        return new TransferOperationExtractor(transactionData).extract()
            .filter(transfer => transfer.hasInputOrOutputAccount(accountId.toString('hex')));
    }
}

