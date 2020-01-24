import { util } from 'postchain-client';
import { AuthDescriptor, GtvSerializable } from "./account";
import Operation from "./operation";

export function addAuthDescriptor(accountId: Buffer, authDescriptorId: Buffer, authDescriptor: AuthDescriptor): Operation {
    return op('ft3.add_auth_descriptor', accountId, authDescriptorId, authDescriptor);
}

export function register(authDescriptor: AuthDescriptor): Operation {
    return op('ft3.dev_register_account', authDescriptor);
}


export function transfer(inputs: Array<GtvSerializable>, outputs: Array<GtvSerializable>): Operation {
    return op('ft3.transfer', inputs, outputs);
}

export function xcTransfer(source: GtvSerializable, target: GtvSerializable, hops: Array<Buffer>): Operation {
    return op('ft3.xc.init_xfer', source, target, hops);
}

export function deleteAllAuthDescriptorsExclude(accountId: Buffer, excludeAuthDescriptorId: Buffer): Operation {
    return op('ft3.delete_all_auth_descriptors_exclude',
        accountId,
        excludeAuthDescriptorId
    );
}

export function deleteAuthDescriptor(accountId: Buffer, authDescriptorId: Buffer, deleteAuthDescriptorId): Operation {
    return op('ft3.delete_auth_descriptor', accountId, authDescriptorId, deleteAuthDescriptorId);
}

export function nop(): Operation {
    return new Operation('nop', util.hash256(Math.random().toString()));
}

export function op(name: string, ...args: GtvSerializable[]): Operation {
    return new Operation(name, ...args);
}

