import Asset from "./asset";
import Blockchain from "./blockchain";

export default class AssetBalance {
    amount: number;
    asset: Asset;

    constructor(amount: number, asset: Asset) {
        this.amount = amount;
        this.asset = asset;
    }

    static async getByAccountId(id: Buffer, blockchain: Blockchain): Promise<AssetBalance[]> {
        const assets = await blockchain.connection.gtx.query('ft3.get_asset_balances', { account_id: id.toString('hex')});

        return assets.map(asset => new AssetBalance(
            asset.amount,
            new Asset(asset.name, Buffer.from(asset.chain_id, 'hex'))
        ));
    }

    static async getByAccountAndAssetId(accountId, assetId, blockchain: Blockchain): Promise<AssetBalance> {
        const asset = await blockchain.connection.gtx.query(
            'ft3.get_asset_balance',
            {
                account_id: accountId.toString('hex'),
                asset_id: assetId.toString('hex')
            }
        );

        if (!asset) {
            return null;
        }

        return new AssetBalance(asset.amount, new Asset(asset.name, asset.chainId));
    }

    static async giveBalance(accountId, assetId, amount, blockchain: Blockchain) {
        const tx = blockchain.connection.gtx.newTransaction([]);
        tx.addOperation('ft3.dev_give_balance', assetId.toString('hex'), accountId.toString('hex'), amount);
        await tx.postAndWaitConfirmation();
    }
}
