import { formatter, Operation } from "postchain-client";
import { Amount } from "@ft4/asset";
import { op, BufferId } from "@ft4/utils";
import { gtv } from "./auth-descriptor";
import { AnyAuthDescriptorRegistration } from "@ft4/accounts";

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
  authDescriptor: AnyAuthDescriptorRegistration,
): Operation {
  return op(
    "ft4.add_auth_descriptor",
    gtv.authDescriptorRegistrationToGtv(authDescriptor),
  );
}

export function deleteAuthDescriptor(authDescriptorId: BufferId): Operation {
  return op(
    "ft4.delete_auth_descriptor",
    formatter.ensureBuffer(authDescriptorId),
  );
}

export function deleteAuthDescriptorsForSigner(signer: BufferId): Operation {
  return op(
    "ft4.delete_auth_descriptors_for_signer",
    formatter.ensureBuffer(signer),
  );
}
