import { gtv } from 'postchain-client';
import {AuthDescriptor} from "../account";
import SingleSignatureAuthDescriptor from "./signle-signature-auth-descriptor";

export default class AuthDescriptorFactory {
    create(type: string, args: Buffer): AuthDescriptor {
        switch (type) {
            case 'S': return this.createSingleSig(args);
        }
    }

    private createSingleSig(args: Buffer): SingleSignatureAuthDescriptor {
        const decodedDescriptor = gtv.decodeGtv(args);
        return new SingleSignatureAuthDescriptor(
            Buffer.from(decodedDescriptor[1], 'hex'),
            decodedDescriptor[0]
        );
    }
}
