import Asset from "./asset";
import Blockchain from "../core/blockchain/blockchain";
import { nop, op } from "./account-operations";

export default class AssetBalance {
  amount: number;
  asset: Asset;

  constructor(amount: number, asset: Asset) {
    this.amount = amount;
    this.asset = asset;
  }

  static async getByAccountId(
    id: Buffer,
    blockchain: Blockchain
  ): Promise<AssetBalance[]> {
    const assets = await blockchain.query("ft3.get_asset_balances", {
      account_id: id,
    });

    return assets.map(
      (asset) =>
        new AssetBalance(
          asset.amount,
          new Asset(asset.name, Buffer.from(asset.chain_id, "hex"))
        )
    );
  }

  static async getByAccountAndAssetId(
    accountId,
    assetId,
    blockchain: Blockchain
  ): Promise<AssetBalance> {
    const asset = await blockchain.query("ft3.get_asset_balance", {
      account_id: accountId,
      asset_id: assetId,
    });

    if (!asset) {
      return null;
    }

    return new AssetBalance(asset.amount, new Asset(asset.name, asset.chainId));
  }

  static async giveBalance(accountId, assetId, amount, blockchain: Blockchain) {
    await blockchain
      .transactionBuilder()
      .add(op("ft3.dev_give_balance", assetId, accountId, amount))
      .add(nop())
      .build([])
      .post();
  }
}
