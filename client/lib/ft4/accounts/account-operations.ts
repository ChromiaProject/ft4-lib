import { op } from "../utils";
import { BufferId } from "../../cryptoUtils";
import { formatter, Operation } from "postchain-client";
import { Amount } from "../asset/interfaces";
import {
  GtvAuthDescriptorRegistration,
  GtvAuthDescriptorArgs,
} from "/ft4/accounts/auth-descriptor";

export function burn(assetId: BufferId, amount: Amount): Operation {
  return op("ft4.burn", formatter.ensureBuffer(assetId), amount.value);
}

export function deleteAllAuthDescriptorsExclude(
  accountId: BufferId,
  excludeAuthDescriptorId: BufferId,
): Operation {
  return op(
    "ft4.delete_all_auth_descriptors_exclude",
    formatter.ensureBuffer(accountId),
    formatter.ensureBuffer(excludeAuthDescriptorId),
  );
}

export function transfer(
  receiverId: BufferId,
  assetId: BufferId,
  amount: Amount,
): Operation {
  return op(
    "ft4.transfer",
    formatter.ensureBuffer(receiverId),
    formatter.ensureBuffer(assetId),
    amount.value,
  );
}

export function addAuthDescriptor(
  authDescriptor: GtvAuthDescriptorRegistration<GtvAuthDescriptorArgs>,
): Operation {
  return op("ft4.add_auth_descriptor", authDescriptor);
}

export function deleteAuthDescriptor(authDescriptorId: BufferId): Operation {
  return op(
    "ft4.delete_auth_descriptor",
    formatter.ensureBuffer(authDescriptorId),
  );
}
