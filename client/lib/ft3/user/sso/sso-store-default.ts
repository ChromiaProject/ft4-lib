import SSOStore from "./sso-store";
import {KeyPair} from "../../../cyptoUtils";


export default class SSOStoreDefault implements SSOStore {
    set accountId(value: Buffer) {}
    get accountId(): Buffer { return null }

    get keyPair(): KeyPair { return null }
    get privKey(): Buffer { return null }
    set privKey(value: Buffer) {}

    get tmpPrivKey(): Buffer {
        const privKeyString = localStorage.getItem('__ssoTmpPrivKey');

        if (!privKeyString) { return null }

        return Buffer.from(privKeyString, 'hex');
    }

    set tmpPrivKey(value: Buffer) {
        localStorage.setItem('__ssoTmpPrivKey', value.toString('hex'));
    }

    get tmpKeyPair(): KeyPair {
        const privKeyString = localStorage.getItem('__ssoTmpPrivKey');

        if (!privKeyString) { return null }

        return new KeyPair(privKeyString);
    }

    clearTmp() {
        localStorage.removeItem('__ssoTmpPrivKey');
    }

    clear() {
        this.clearTmp();
    }
}