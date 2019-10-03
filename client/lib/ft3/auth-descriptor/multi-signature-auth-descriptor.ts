import { gtv } from 'postchain-client';
import {AuthDescriptor, AuthType, Flags, FlagsType, PubKey} from "../account";

export default class MultiSignatureAuthDescriptor implements AuthDescriptor {
    pubkeys: PubKey[];
    flags: Flags;
    signaturesRequired: number;

    constructor(pubkeys: PubKey[], signaturesRequired: number, flags: FlagsType[]) {
        if (signaturesRequired > pubkeys.length) {
            throw new Error('Number of required signatures have to be less or equal to number of pubkeys');
        }

        this.pubkeys = pubkeys;
        this.signaturesRequired = signaturesRequired;
        this.flags = new Flags(new Set(flags));
    }

    get signers(): PubKey[] {
        return this.pubkeys;
    }

    get id(): Buffer {
        return this.hash()
    }

    toGTV(): any[] {
        return [
            AuthType.multi_sig,
            this.pubkeys.map(pubkey => pubkey.toString('hex')),
            [
                this.flags.toGTV(),
                this.signaturesRequired,
                this.pubkeys.map(pubkey => pubkey.toString('hex'))
            ]
        ]
    }

    hash(): Buffer {
        return gtv.gtvHash([
            AuthType.multi_sig,
            this.pubkeys,
            [
                this.flags.toGTV(),
                this.signaturesRequired,
                this.pubkeys.map(pubkey => pubkey.toString('hex'))
            ]
        ]);
    }
}
