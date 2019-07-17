enum AuthType {
    single_sig = "S",
    multi_sig = "M",
}

enum FlagsType {
    A = "A", // Change Account settings
    T = "T" // Transfer balance
}

type PubKey = Buffer;

class Flags {
    accountEx: boolean; // account Execution, it can execute create / update/ delete on account operations
    transactionEx: boolean; // can create transactions

    constructor(accountEx: boolean, transactionEx: boolean) {
        this.accountEx = accountEx;
        this.transactionEx = transactionEx;
    }

    toGTV() {
        return [this.accountEx? 1: 0, this.transactionEx? 1:0];
    }

}

class Auth {
    flags: Flags;

    constructor(flags: Flags) {
        this.flags = flags;
    }

    toGTV() {
        return [this.flags.toGTV()];
    }

}

class SingleSignatureAuth extends Auth {
    pubkey: PubKey;

    constructor(flags: Flags, pubkey: PubKey) {
        super(flags);
        this.pubkey = pubkey;
    }

    toGTV(): any[] {
        return [...super.toGTV(), this.pubkey];
    }
}

class AuthDescriptor {
    authType: AuthType;
    auth: SingleSignatureAuth;

    constructor(authType: AuthType, auth: SingleSignatureAuth) {
        this.authType = authType;
        this.auth = auth;
    }

    toGTV() {
        return [this.authType, this.auth.toGTV()];
    }
}


class Account {
    id_: Buffer;
    authDescriptor: AuthDescriptor[];

    constructor(authDescriptor?: AuthDescriptor[]) {
        if (authDescriptor) {
            this.authDescriptor = authDescriptor;
        }
    }

    register(tx: any) {
        if (process.env.DEV) {
            if (this.authDescriptor.length != 1) throw Error("You can register new account only with 1 descriptor")
            console.log(this.authDescriptor[0].toGTV());
            tx.addOperation('ft3.dev_register_account', this.authDescriptor[0].toGTV());
            return tx;
        } else {
            throw Error("You have to enable DEV mode")
        }
    }
}



export {
    Account,
    AuthDescriptor,
    AuthType,
    SingleSignatureAuth,
    Flags
}

