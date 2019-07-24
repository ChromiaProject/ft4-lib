import { gtv } from 'postchain-client';
import { gtx } from "../../blockchain";

class Asset {
    name: string;
    chainId: Buffer;

    constructor(name: string, chainId: Buffer) {
        this.name = name;
        this.chainId = chainId;
    }

    get id() {
        return gtv.gtvHash([this.name, this.chainId]);
    }

    static async register(name: string, chainId: Buffer) {
        const tx = gtx.newTransaction([]);
        tx.addOperation('ft3.dev_register_asset', name, chainId.toString('hex'), chainId.toString('hex'));
        await tx.postAndWaitConfirmation();
        return new Asset(name, chainId);
    }
}

export default Asset;