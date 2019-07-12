import * as pcl from 'postchain-client';
import {buffToHex, hexToBuff} from "./index";
import {gtx} from "../../blockchain";

class KeyPair {

    readonly pubKey: Buffer;
    readonly privKey: Buffer;

    constructor(privateKey?: string) {
        if (privateKey) {
            this.privKey = hexToBuff(privateKey);
            this.pubKey = pcl.util.createPublicKey(this.privKey);
        } else {
            const {pubKey, privKey} = this.makeKeyPair();
            this.pubKey = pubKey;
            this.privKey = privKey;
        }
    }

    updateKeyPair(privKey: string) {

    }

    newTx = () => {
        return gtx.newTransaction([this.pubKey]);
    };

    makeKeyPair = () => {
        return pcl.util.makeKeyPair();
    };

}

export default KeyPair;