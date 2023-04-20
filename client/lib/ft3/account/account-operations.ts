import { op } from "../utils";
import { XferInput, XferOutput } from "./types";
import { Operation } from "../utils/types";
import { authDescriptor as authDesc } from "./auth-descriptor";
import { AuthDescriptor } from "./auth-descriptor/types";

export function addAuthDescriptorOp(
  accountId: Buffer,
  authDescriptorId: Buffer,
  authDescriptor: AuthDescriptor
): Operation {
  return op(
    "ft3.add_auth_descriptor",
    accountId,
    authDescriptorId,
    authDesc.toGtv(authDescriptor)
  );
}

export function transferOp(
  inputs: XferInput[],
  outputs: XferOutput[]
): Operation {
  return op("ft3.transfer", inputs, outputs);
}

export function xcTransferOp /*
  source: GtvCompatible,
  target: GtvCompatible,
  hops: Array<Buffer>*/(): Operation {
  throw new Error("Not implemented!");
  //return op("ft3.xc.init_xfer", source, target, hops);
}

export function deleteAllAuthDescriptorsExcludeOp(
  accountId: Buffer,
  excludeAuthDescriptorId: Buffer
): Operation {
  return op(
    "ft3.delete_all_auth_descriptors_exclude",
    accountId,
    excludeAuthDescriptorId
  );
}

export function deleteAuthDescriptorOp(
  accountId: Buffer,
  authDescriptorId: Buffer,
  deleteAuthDescriptorId: Buffer
): Operation {
  return op(
    "ft3.delete_auth_descriptor",
    accountId,
    authDescriptorId,
    deleteAuthDescriptorId
  );
}
