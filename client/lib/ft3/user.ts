import { AuthDescriptor } from "./account";
import KeyPair from "../cyptoUtils/keyPair";

class User {
    keyPair: KeyPair;
    authDescriptor: AuthDescriptor;

    constructor(keyPair: KeyPair, authDescriptor: AuthDescriptor) {
        this.keyPair = keyPair;
        this.authDescriptor = authDescriptor;
    }
}

export default User;