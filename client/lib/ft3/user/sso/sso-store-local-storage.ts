import SSOStore from "./sso-store";
import KeyPair from "../../../cyptoUtils/keyPair";

export default class SSOStoreLocalStorage implements SSOStore {
    get tmpKeyPair(): KeyPair {
        const privKeyString = localStorage.getItem('__ssoTmpPrivKey');

        if (!privKeyString) { return null }

        return new KeyPair(privKeyString);
    }

    get keyPair(): KeyPair {
        const privKeyString = localStorage.getItem('__ssoPrivKey');

        if (!privKeyString) { return null }

        return new KeyPair(privKeyString);
    }

    get tmpPrivKey(): Buffer {
        const privKeyString = localStorage.getItem('__ssoTmpPrivKey');

        if (!privKeyString) { return null }

        return Buffer.from(privKeyString, 'hex');
    }

    set tmpPrivKey(value: Buffer) {
        localStorage.setItem('__ssoTmpPrivKey', value.toString('hex'));
    }

    get privKey(): Buffer {
        const privKeyString = localStorage.getItem('__ssoPrivKey');

        if (!privKeyString) { return null }

        return Buffer.from(privKeyString, 'hex');
    }

    set privKey(value: Buffer) {
        localStorage.setItem('__ssoPrivKey', value.toString('hex'));
    }

    get accountId(): Buffer {
        const accountIdString = localStorage.getItem('__ssoAccountId');

        if (!accountIdString) { return null }

        return Buffer.from(accountIdString, 'hex');
    }

    set accountId(value: Buffer) {
        localStorage.setItem('__ssoAccountId', value.toString('hex'));
    }

    clearTmp() {
        localStorage.removeItem('__ssoTmpPrivKey');
    }

    clear(): void {
        this.clearTmp();
        localStorage.removeItem('__ssoPrivKey');
        localStorage.removeItem('__ssoAccountId');
    }
}