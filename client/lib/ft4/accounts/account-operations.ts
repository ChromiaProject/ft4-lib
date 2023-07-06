import { _op, op } from "../utils";
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

export function burnOp(assetId: BufferId, amount: Amount): Operation {
  return op("ft4.burn", formatter.ensureBuffer(assetId), Number(amount));
}

export function _burn(assetId: BufferId, amount: Amount): _Operation {
  return _op("ft4.burn", formatter.ensureBuffer(assetId), amount.value);
}

export function deleteAllAuthDescriptorsExclude(
  accountId: BufferId,
  excludeAuthDescriptorId: BufferId
): Operation {
  return op(
    "ft4.delete_all_auth_descriptors_exclude",
    formatter.ensureBuffer(accountId),
    formatter.ensureBuffer(excludeAuthDescriptorId)
  );
}

export function _deleteAllAuthDescriptorsExclude(
  accountId: BufferId,
  excludeAuthDescriptorId: BufferId
): _Operation {
  return _op(
    "ft4.delete_all_auth_descriptors_exclude",
    formatter.ensureBuffer(accountId),
    formatter.ensureBuffer(excludeAuthDescriptorId)
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

export function transfer(
  receiverId: BufferId,
  assetId: BufferId,
  amount: Amount
): _Operation {
  return _op(
    "ft4.transfer",
    formatter.ensureBuffer(receiverId),
    formatter.ensureBuffer(assetId),
    amount.value
  );
}

export function addAuthDescriptor(authDescriptor: AuthDescriptor): _Operation {
  return _op("ft4.add_auth_descriptor", authDesc.toGtv(authDescriptor));
}

export function deleteAuthDescriptor(authDescriptorId: BufferId): _Operation {
  return _op(
    "ft4.delete_auth_descriptor",
    formatter.ensureBuffer(authDescriptorId)
  );
}
