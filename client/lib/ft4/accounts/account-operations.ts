import { _op, op } from "../utils";
import { XferInput, XferOutput } from "./types";
import { Operation } from "../utils/types";
import { authDescriptor as authDesc } from "./auth-descriptor";
import { AuthDescriptor } from "./auth-descriptor/types";
import { BufferId } from "../../cryptoUtils";
import { formatter, Operation as _Operation } from "postchain-client";
import { Amount } from "../asset/interfaces";
import { Buffer } from "buffer";

export function addAuthDescriptorOp(
  accountId: Buffer,
  authDescriptorId: Buffer,
  authDescriptor: AuthDescriptor
): Operation {
  return op(
    "ft4.add_auth_descriptor",
    accountId,
    authDescriptorId,
    authDesc.toGtv(authDescriptor)
  );
}

export function transferOp(
  inputs: XferInput[],
  outputs: XferOutput[]
): Operation {
  return op("ft4.transfer", inputs, outputs);
}

export function _transferOp(
  inputs: XferInput[],
  outputs: XferOutput[]
): _Operation {
  return _op("ft4.transfer", inputs, outputs);
}

export function burnOp(assetId: BufferId, amount: Amount): Operation {
  return op("ft4.burn", formatter.ensureBuffer(assetId), Number(amount));
}

export function xcTransferOp /*
  source: RawGtv,
  target: RawGtv,
  hops: Array<Buffer>*/(): Operation {
  throw new Error("Not implemented!");
  //return op("ft4.xc.init_xfer", source, target, hops);
}

export function deleteAllAuthDescriptorsExcludeOp(
  accountId: Buffer,
  excludeAuthDescriptorId: Buffer
): Operation {
  return op(
    "ft4.delete_all_auth_descriptors_exclude",
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
    "ft4.delete_auth_descriptor",
    accountId,
    authDescriptorId,
    deleteAuthDescriptorId
  );
}

export function transferV2(
  receiverId: BufferId,
  assetId: BufferId,
  amount: Amount
) {
  return _op(
    "ft4.transfer_one",
    formatter.ensureBuffer(receiverId),
    formatter.ensureBuffer(assetId),
    amount.value
  );
}

export function addAuthDescriptorV2(
  authDescriptor: AuthDescriptor
): _Operation {
  return _op("ft4.add_auth_descriptor_v2", authDesc.toGtv(authDescriptor));
}

export function deleteAuthDescriptorV2(authDescriptorId: BufferId): _Operation {
  return _op(
    "ft4.delete_auth_descriptor_v2",
    formatter.ensureBuffer(authDescriptorId)
  );
}
