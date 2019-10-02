import { gtv, gtx } from 'postchain-client';
import PaymentHistory from "./payment-history";
import PaymentHistoryStoreLocalStorage from "./payment-history-store-local-storage";
import PaymentHistoryEntry from "./payment-history-entry";
import PaymentHistoryStore from "./payment-history-store";
import Blockchain from "../blockchain";
import PaymentHistoryEntryShort from "./payment-history-entry-short";
import PaymentOperationExtractor from "../payment-operation-extractor";
import PaymentOperation from "./payment-operation/payment-operation";
import PaymentParam from "./payment-operation/payment-param";


class ParamPaymentPair {
    readonly param: PaymentParam;
    readonly payment: PaymentOperation;

    constructor(param: PaymentParam, payment: PaymentOperation) {
        this.param = param;
        this.payment = payment;
    }
}

export default class PaymentHistorySyncManager {
    readonly paymentHistoryStore: PaymentHistoryStore = new PaymentHistoryStoreLocalStorage();

    async syncAccount(id: Buffer, blockchain: Blockchain) {
        const syncInfo = this.paymentHistoryStore.getSyncInfo(id);
        const lastBlock = +syncInfo.lastBlock || -1;

        const paymentHistory = await PaymentHistory.getByAccountId(id, lastBlock, blockchain.connection);
        if (paymentHistory.length === 0) { return }

        //Add missing sender/receiver info to payment history entries
        const paymentHistoryEntries = this.mapShortEntriesToLongEntries(paymentHistory, blockchain.id, id);
        this.paymentHistoryStore.save(id, paymentHistoryEntries);
        syncInfo.lastBlock = this.getHighestBlock(paymentHistoryEntries, lastBlock);
        this.paymentHistoryStore.saveSyncInfo(id, syncInfo);
    }

    private mapShortEntriesToLongEntries(entries: PaymentHistoryEntryShort[], chainId: Buffer, accountId: Buffer): PaymentHistoryEntry[] {
        const entriesMap = this.groupShortEntriesByTransactionRID(entries);
        const paymentHistoryEntries: PaymentHistoryEntry[][] = [];

        for (const entries of entriesMap.values()) {
            paymentHistoryEntries.push(this.paymentHistoryEntriesFrom(entries, chainId, accountId));
        }

        return paymentHistoryEntries.flat().reverse()
    }

    private groupShortEntriesByTransactionRID(entries: PaymentHistoryEntryShort[]): Map<string, any[]> {
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

        // Get all the payments from the transaction which are related to the current account,
        // and then get all inputs and outputs for which current account is source or destination.
        const payments = this.getPaymentsForChainAndAccountFromRawTransaction(
            chainId.toString('hex'),
            accountId,
            firstEntry.transactionData
        );

        let inputs = payments
            .map(payment =>
                payment.inputsWithChainAndAccount(chainId.toString('hex'), accountId.toString('hex'))
                    .map(input => new ParamPaymentPair(input, payment))
            )
            .flat();

        let outputs = payments
            .map(payment =>
                payment.outputsWithChainAndAccount(chainId.toString('hex'), accountId.toString('hex'))
                    .map(output => new ParamPaymentPair(output, payment))
            )
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
                const input = this.matchPaymentHistoryEntryAndPaymentParam(entry, inputs, accountId);
                if (!input) { throw new Error('Cannot match payment history entry to any transfer input') }
                inputs = inputs.filter(i => i !== input);
                paymentHistoryEntries.push(this.getPaymentHistoryEntry(entry, input.payment));
            } else {
                const output = this.matchPaymentHistoryEntryAndPaymentParam(entry, outputs, accountId);
                if (!output) { throw new Error('Cannot match payment history entry to any transfer output') }
                outputs = outputs.filter(o => o !== output);
                paymentHistoryEntries.push(this.getPaymentHistoryEntry(entry, output.payment));
            }
        }

        return paymentHistoryEntries
    }

    private matchPaymentHistoryEntryAndPaymentParam(entry: PaymentHistoryEntryShort, params: ParamPaymentPair[], accountId: Buffer): ParamPaymentPair {
        return params.find(param => (
            param.param.isAccountId(accountId.toString('hex')) &&
            param.param.isAssetId(entry.assetId) &&
            param.param.amount === entry.delta
            //TODO: compare entry index
        ));
    }

    private getPaymentHistoryEntry(entry: PaymentHistoryEntryShort, payment: PaymentOperation): PaymentHistoryEntry {
        const other
            = entry.isInput
            ? payment.outputsWithAsset(entry.assetId).map(({ chainId, accountId }) => ({ chainId, accountId }))
            : payment.inputsWithAsset(entry.assetId).map(({ chainId, accountId }) => ({ chainId, accountId }));

        return new PaymentHistoryEntry(
            entry.isInput,
            entry.delta,
            entry.asset,
            Buffer.from(entry.assetId, 'hex'),
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

    private getPaymentsForChainAndAccountFromRawTransaction(
        chainId: string,
        accountId: Buffer,
        transactionData: Buffer
    ): PaymentOperation[] {
        return new PaymentOperationExtractor(transactionData, chainId)
            .extract()
            .filter(transfer =>
                transfer.hasInputOrOutputWithChainAndAccount(chainId, accountId.toString('hex'))
            );
    }
}

