import { gtv } from 'postchain-client';
import Blockchain from "../core/blockchain/blockchain";
import {op} from "./account-operations";

export default class Asset {
    name: string;
    chainId: Buffer;

    constructor(name: string, chainId: Buffer) {
        this.name = name;
        this.chainId = chainId;
    }

    get id() {
        return gtv.gtvHash([this.name, this.chainId]);
    }

    static async register(name: string, chainId: Buffer, blockchain: Blockchain): Promise<Asset> {
        await blockchain.transactionBuilder()
            .add(op('ft3.dev_register_asset', name, chainId))
            .build([])
            .post();
        return new Asset(name, chainId);
    }

    static async getByName(name: string, blockchain: Blockchain): Promise<Asset[]>  {
        const assets = await blockchain.query('ft3.get_asset_by_name', { name });
        return assets.map(({ name, issuing_chain_rid }) =>
            new Asset(name, Buffer.from(issuing_chain_rid, 'hex'))
        );
    }

    static async getById(id: Buffer, blockchain: Blockchain) {
        const asset = await blockchain.query('ft3.get_asset_by_id', { asset_id: id });
        return new Asset(asset.name, Buffer.from(asset.issuing_chain_rid, "hex"));
    }

    static async getAssets(blockchain: Blockchain) {
        const assets = await blockchain.query("ft3.get_all_assets", {});
        return assets.map(({name, issuing_chain_rid}) => {
            return new Asset(name, Buffer.from(issuing_chain_rid, 'hex'));
        });
    }
}
