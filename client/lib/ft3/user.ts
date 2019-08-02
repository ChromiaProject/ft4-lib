import { AuthDescriptor } from "./account";
import KeyPair from "../cyptoUtils/keyPair";

export default class User {
    keyPair: KeyPair;
    authDescriptor: AuthDescriptor;

    constructor(keyPair: KeyPair, authDescriptor: AuthDescriptor) {
        this.keyPair = keyPair;
        this.authDescriptor = authDescriptor;
    }
}
