import { gtv } from "postchain-client";
import Blockchain from "../core/blockchain/blockchain";
import { op } from "./account-operations";

export default class Asset {
  name: string;
  brid: Buffer;

  constructor(name: string, brid: Buffer) {
    this.name = name;
    this.brid = brid;
  }

  get id() {
    return gtv.gtvHash([this.name, this.brid]);
  }

  static async register(
    name: string,
    brid: Buffer,
    blockchain: Blockchain
  ): Promise<Asset> {
    await blockchain
      .transactionBuilder()
      .add(op("ft3.dev_register_asset", name, brid))
      .build([])
      .post();
    return new Asset(name, brid);
  }

  static async getByName(
    name: string,
    blockchain: Blockchain
  ): Promise<Asset[]> {
    const assets = await blockchain.query("ft3.get_asset_by_name", { name });
    return assets.map(
      ({ name, issuing_BRID }) =>
        new Asset(name, Buffer.from(issuing_BRID, "hex"))
    );
  }

  static async getById(id: Buffer, blockchain: Blockchain) {
    const asset = await blockchain.query("ft3.get_asset_by_id", {
      asset_id: id,
    });
    return new Asset(asset.name, Buffer.from(asset.issuing_BRID, "hex"));
  }

  static async getAssets(blockchain: Blockchain) {
    const assets = await blockchain.query("ft3.get_all_assets", {});
    return assets.map(({ name, issuing_BRID }) => {
      return new Asset(name, Buffer.from(issuing_BRID, "hex"));
    });
  }
}
