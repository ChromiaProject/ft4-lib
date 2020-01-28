import { AssetBalance, Operation } from "../../client/lib/ft3";
import Blockchain from "../../client/lib/ft3/blockchain";
import TransactionBuilder from "../../client/lib/ft3/transaction-builder";
import AdminKeyPair from "./admin-keypair";



export class TestnetAssetBalance extends AssetBalance {
    static async giveBalance(accountId, assetId, amount, blockchain: Blockchain) {
        await new TransactionBuilder(blockchain)
            .add(new Operation('ft3.dev_give_balance', assetId.toString('hex'), accountId.toString('hex'), amount))
            .build([AdminKeyPair.get().pubKey])
            .sign(AdminKeyPair.get())
            .post()
    }
}