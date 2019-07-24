import Asset from "./asset";
import {gtx} from "../../blockchain";

class AssetBalance {
    amount: number;
    asset: Asset;

    constructor(amount: number, asset: Asset) {
        this.amount = amount;
        this.asset = asset;
    }

    static async getByAccountId(id: Buffer): Promise<AssetBalance[]> {
        const assets = await gtx.query('ft3.get_asset_balances', { account_id: id.toString('hex')});

        return assets.map(asset => new AssetBalance(
            asset.amount,
            new Asset(asset.name, Buffer.from(asset.chain_id, 'hex'))
        ));
    }

    static async getByAccountAndAssetId(accountId, assetId): Promise<AssetBalance> {
        const asset = await gtx.query(
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
}

export default AssetBalance;