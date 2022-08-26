import { util } from "postchain-client";
import { AuthDescriptor } from "./account-utils";
import GtvSerializable from "../core/gtv";
import Operation from "../core/operation";
import { XferInput, XferOutput } from "./transfer";

export function addAuthDescriptor(
  accountId: Buffer,
  authDescriptorId: Buffer,
  authDescriptor: AuthDescriptor
): Operation {
  return op(
    "ft3.add_auth_descriptor",
    accountId,
    authDescriptorId,
    authDescriptor
  );
}

export function transfer(
  inputs: XferInput[],
  outputs: XferOutput[]
): Operation {
  return op("ft3.transfer", inputs, outputs);
}

export function xcTransfer(
  source: GtvSerializable,
  target: GtvSerializable,
  hops: Array<Buffer>
): Operation {
  return op("ft3.xc.init_xfer", source, target, hops);
}

export function deleteAllAuthDescriptorsExclude(
  accountId: Buffer,
  excludeAuthDescriptorId: Buffer
): Operation {
  return op(
    "ft3.delete_all_auth_descriptors_exclude",
    accountId,
    excludeAuthDescriptorId
  );
}

export function deleteAuthDescriptor(
  accountId: Buffer,
  authDescriptorId: Buffer,
  deleteAuthDescriptorId
): Operation {
  return op(
    "ft3.delete_auth_descriptor",
    accountId,
    authDescriptorId,
    deleteAuthDescriptorId
  );
}

export function nop(): Operation {
  return new Operation("nop", util.randomBytes(32));
}

export function op(
  name: string,
  ...args: Array<GtvSerializable | null | undefined>
): Operation {
  return new Operation(name, ...args);
}
