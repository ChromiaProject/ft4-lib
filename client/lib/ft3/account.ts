
enum AuthType {
    single_sig,
    multi_sig,
}

enum flags {
    A = "A",

}

class Auth {
    flags: string[];
    pubkey: Buffer;

    constructor(pubkey: Buffer, flags: string[]) {
        this.pubkey = pubkey;
        this.flags = this.verifyFlags(flags);
    }

    // Checks that the flags are correct (i.e. no wrong flags)
    // Accepted flags are:
    verifyFlags()

}

class SingleSignatureAuth extends Auth {

}

class AuthDescriptor {
    authType: AuthType;
    args: any; // gtv
}


class Account {
    id_: Buffer;
    authDescriptor: AuthDescriptor;

    constructor(id?: Buffer, authDescriptor?: AuthDescriptor) {
        if (id && authDescriptor) {
            this.id_ = id;
            this.authDescriptor = authDescriptor;
        }
    }

    register(tx: any) {
        if (process.env.DEV) {
            tx.addOperation('dev_register_account', this.authDescriptor);
            return tx;
        }
    }
}


export default Account;