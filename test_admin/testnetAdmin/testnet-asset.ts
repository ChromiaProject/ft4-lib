import {Asset, Operation, KeyPair} from "../../client/lib/ft3";
import {Blockchain} from "../../client/lib/ft3";
import AdminKeyPair from "./admin-keypair";



export class TestnetAsset extends Asset {

    static async register(name: string, chainId: Buffer, blockchain: Blockchain) {
        const tx = await blockchain.transactionBuilder()
            .add(new Operation("ft3.dev_register_asset", name, chainId.toString('hex')))
            .build([AdminKeyPair.get().pubKey])
            .sign(AdminKeyPair.get())
            .post();
        return new Asset(name, chainId);
    }

}