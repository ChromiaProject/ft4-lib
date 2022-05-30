import * as pcl from 'postchain-client';
import {hexToBuff} from "./index";

class KeyPair {

    readonly pubKey: Buffer;
    readonly privKey: Buffer;

    constructor(privateKey?: Buffer | string) {
        if (privateKey) {
            this.privKey = typeof privateKey === "string"? hexToBuff(privateKey) : privateKey;
            this.pubKey = pcl.util.createPublicKey(this.privKey);
        } else {
            const {pubKey, privKey} = this.makeKeyPair();
            this.pubKey = pubKey;
            this.privKey = privKey;
        }
    }

    makeKeyPair = () => {
        return pcl.util.makeKeyPair();
    };

}

export default KeyPair;
