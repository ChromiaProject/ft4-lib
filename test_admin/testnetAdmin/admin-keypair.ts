import { User, FlagsType, SingleSignatureAuthDescriptor } from "../../client/lib/ft3";
import  KeyPair from "../../client/lib/cyptoUtils/keyPair";

export default class AdminKeyPair {
    
    private static keyPair: KeyPair = null;
    private static user: User = null;

    static change(privKey: string) {
        this.keyPair = new KeyPair(privKey);
    }

    private AdminKeyPair() {}

    private static initialize() {
        if (this.keyPair == null) {
            this.keyPair = new KeyPair(process.env.ADMIN_1_PRIV)
        }
    }

    private static initializeUser() {
        if(this.user == null) {
            if(this.keyPair == null) this.initialize();
            const authDescr = new SingleSignatureAuthDescriptor(
                this.keyPair.pubKey,
                [FlagsType.Account, FlagsType.Transfer]
            );
            this.user = new User(this.keyPair, authDescr);
        }
    }

    static get(): KeyPair {
        if (this.user == null) this.initialize();
        return this.keyPair;
    }

    static getAsUser(): User {
        if (this.user == null) this.initializeUser();
        return this.user;
    }
}
