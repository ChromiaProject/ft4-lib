import BlockchainSession from "../core/blockchain/blockchain-session";
import Blockchain from "../core/blockchain/blockchain";
import Transaction from "../core/transaction";
import {
    transfer,
    addAuthDescriptor,
    nop,
    deleteAllAuthDescriptorsExclude,
    xcTransfer,
    deleteAuthDescriptor
} from "./account-operations";
import { register } from "./account-dev-operations";
import AuthDescriptorRule from "./auth-descriptor/auth-descriptor-rule";
import Operation from "../core/operation";
import User from "./user";

type PubKey = Buffer;

interface GtvSerializable {
    toGTV(): any[];
}

interface AuthDescriptor extends GtvSerializable {
    id: Buffer;
    signers: PubKey[];
    rule: AuthDescriptorRule | null;
    hash(): Buffer;
}

export default class AccountTransactions {
    readonly id: Buffer;
    readonly session: BlockchainSession;

    constructor(id: Buffer, authDescriptor: AuthDescriptor[], session: BlockchainSession) {
        this.id = id;
        this.session = session;
    }

    addAuthDescriptor(authDescriptor: AuthDescriptor): Transaction {
        return this.session.blockchain.transactionBuilder()
            .add(addAuthDescriptor(this.id, this.session.user.authDescriptor.id, authDescriptor))
            .add(nop())
            .build([this.session.user.authDescriptor.signers , authDescriptor.signers].flat())
            .sign(this.session.user.keyPair)
    }

    deleteAllAuthDescriptorsExclude(authDescriptor: AuthDescriptor): Transaction {
        return this.session.blockchain.transactionBuilder()
            .add(deleteAllAuthDescriptorsExclude(this.id, authDescriptor.id))
            .build([this.session.user.authDescriptor.signers , authDescriptor.signers].flat())
            .sign(this.session.user.keyPair)
    }

    deleteAuthDescriptor(authDescriptor: AuthDescriptor): Transaction {
        return this.session.blockchain.transactionBuilder()
            .add(deleteAuthDescriptor(this.id, this.session.user.authDescriptor.id, authDescriptor.id))
            .build([this.session.user.authDescriptor.signers , authDescriptor.signers].flat())
            .sign(this.session.user.keyPair)
    }

    transferInputsToOutputs(inputs: Array<GtvSerializable>, outputs: Array<GtvSerializable>): Transaction {
        return this.session.blockchain.transactionBuilder()
            .add(transfer(inputs, outputs))
            .add(nop())
            .buildAndSign(this.session.user)
    }

    xcTransfer(destinationChainId: Buffer, destinationAccountId: Buffer, assetId: Buffer, amount: number): Transaction {
        return this.session.blockchain.transactionBuilder()
            .add(this.xcTransferOp(destinationChainId, destinationAccountId, assetId, amount))
            .add(nop())
            .buildAndSign(this.session.user)
    }

    /* Operation and query */

    xcTransferOp(destinationChainId: Buffer, destinationAccountId: Buffer, assetId: Buffer, amount: number): Operation {
        const source = [
            this.id,
            assetId,
            this.session.user.authDescriptor.id,
            amount,
            []
        ];
        const target = [
            destinationAccountId,
            []
        ];
        const hops = [
            destinationChainId
        ];

        return xcTransfer(source, target, hops);
    }
}
