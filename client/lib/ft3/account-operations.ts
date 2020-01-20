import { util } from 'postchain-client';
import { AuthDescriptor, GtvSerializable } from "./account";
import Operation from "./operation";

export function addAuthDescriptor(accountId: Buffer, authDescriptorId: Buffer, authDescriptor: AuthDescriptor): Operation {
    return new Operation('ft3.add_auth_descriptor', accountId, authDescriptorId, authDescriptor);
}

export function register(authDescriptor: AuthDescriptor): Operation {
    return new Operation('ft3.dev_register_account', authDescriptor);
}


export function transfer(inputs: Array<GtvSerializable>, outputs: Array<GtvSerializable>): Operation {
    return new Operation('ft3.transfer', inputs, outputs);
}

export function xcTransfer(source: GtvSerializable, target: GtvSerializable, hops: Array<Buffer>): Operation {
    return new Operation('ft3.xc.init_xfer', source, target, hops);
}

export function deleteAllAuthDescriptorsExclude(accountId: Buffer, excludeAuthDescriptorId: Buffer): Operation {
    return new Operation('ft3.delete_all_auth_descriptors_exclude',
        accountId,
        excludeAuthDescriptorId
    );
}

export function nop(): Operation {
    return new Operation('nop', util.hash256(Math.random().toString()));
}

export function op(name: string, ...args: GtvSerializable[]): Operation {
    return new Operation(name, ...args);
}

// one operation that updates the counter of rate limit of the account but does not cost points
export function freeOp(accountId: Buffer): Operation {
    console.log("QQ", accountId);
    return new Operation("ft3.dev_free_op", accountId);
}

