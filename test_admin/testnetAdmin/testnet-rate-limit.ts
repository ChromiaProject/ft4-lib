import RateLimit from "../../client/lib/ft3/rate-limit";
import { TestnetAssetBalance as AssetBalance } from "./testnet-asset-balance";
import { TestnetAsset as Asset } from "./testnet-asset";
import Blockchain from "../../client/lib/ft3/blockchain";
import { freeOp, givePoints } from "../../client/lib/ft3/account-dev-operations";
import { nop } from "../../client/lib/ft3";
import AdminKeyPair from "./admin-keypair";

export class TestnetRateLimit extends RateLimit {
    
    static async execFreeOperation(accountId: Buffer, blockchain: Blockchain) {
        await blockchain.transactionBuilder()
            .add(freeOp(accountId))
            .add(nop())
            .build([AdminKeyPair.get().pubKey])
            .sign(AdminKeyPair.get())
            .post()
    }

    static async givePoints(accountId: Buffer, points: number, blockchain: Blockchain) {
        await blockchain.transactionBuilder()
            .add(givePoints(accountId, points))
            .add(nop())
            .build([AdminKeyPair.get().pubKey])
            .sign(AdminKeyPair.get())
            .post()
    }

}