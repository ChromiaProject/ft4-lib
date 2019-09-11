import { gtv } from 'postchain-client';
import Blockchain from "./blockchain";

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

    static async register(name: string, chainId: Buffer, blockchain: Blockchain) {
        const tx = blockchain.connection.gtx.newTransaction([]);
        tx.addOperation('ft3.dev_register_asset', name, chainId.toString('hex'), chainId.toString('hex'));
        await tx.postAndWaitConfirmation();
        return new Asset(name, chainId);
    }

    static async getByName(name: string, blockchain: Blockchain): Promise<Asset[]>  {
        const assets = await blockchain.connection.gtx.query('ft3.get_asset_by_name', { name });
        return assets.map(({ name, issuing_chain_rid }) =>
            new Asset(name, Buffer.from(issuing_chain_rid, 'hex'))
        );
    }
}
