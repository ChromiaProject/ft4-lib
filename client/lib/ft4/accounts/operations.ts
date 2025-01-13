import { BufferId, formatter, Operation } from "postchain-client";
import { Amount } from "@ft4/asset";
import { op } from "@ft4/utils";
import { gtv } from "./auth-descriptor";
import { AnyAuthDescriptorRegistration } from "@ft4/accounts";

/**
 * Creates an operation object that can be used to call the `ft4.burn`-operation
 * @param assetId - id of the asset to burn
 * @param amount - how much of the asset to burn
 */
export function burn(assetId: BufferId, amount: Amount): Operation {
  return op("ft4.burn", formatter.ensureBuffer(assetId), amount.value);
}

/**
 * Creates an operation object that can be used to call the `ft4.transfer`-operation
 * @param receiverId - id of the account that will receive this transfer
 * @param assetId - the id of the asset to transfer
 * @param amount - how much of said asset to transfer
 */
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

/**
 * Creates an operation object that can be used to call the `ft4.update_main_auth_descriptor`-operation
 * @param authDescriptor - information for the new main auth descriptor
 */
export function updateMainAuthDescriptor(
  authDescriptor: AnyAuthDescriptorRegistration,
): Operation {
  return op(
    "ft4.update_main_auth_descriptor",
    gtv.authDescriptorRegistrationToGtv(authDescriptor),
  );
}

/**
 * Creates an operation object that can be used to call the `ft4.recall_unclaimed_transfer`-operation
 * @param txRid - the rid of the tx in which the transfer to recall was submitted
 * @param opIndex - the index of the transfer to recall inside the tx pointed out by `txRid`
 */
export function recallUnclaimedTransfer(
  txRid: BufferId,
  opIndex: number,
): Operation {
  return op(
    "ft4.recall_unclaimed_transfer",
    formatter.ensureBuffer(txRid),
    opIndex,
  );
}

/**
 * Creates an operation object that can be used to call the `ft4.add_auth_descriptor`-operation
 * @param authDescriptor - the auth descriptor information to add
 */
export function addAuthDescriptor(
  authDescriptor: AnyAuthDescriptorRegistration,
): Operation {
  return op(
    "ft4.add_auth_descriptor",
    gtv.authDescriptorRegistrationToGtv(authDescriptor),
  );
}

/**
 * Creates an operation object that can be used to call the `ft4.delete_auth_descriptor`-operation
 * @param authDescriptorId - the id of the auth descriptor to delete
 */
export function deleteAuthDescriptor(authDescriptorId: BufferId): Operation {
  return op(
    "ft4.delete_auth_descriptor",
    formatter.ensureBuffer(authDescriptorId),
  );
}

/**
 * Creates an operation object that can be used to call the `ft4.delete_auth_descriptors_for_signer`-operation
 * @param signer - the signer for which to delete auth descriptors
 */
export function deleteAuthDescriptorsForSigner(signer: BufferId): Operation {
  return op(
    "ft4.delete_auth_descriptors_for_signer",
    formatter.ensureBuffer(signer),
  );
}

/**
 * Creates an operation object that can be used to call the `ft4.delete_all_auth_descriptors_except_main`-operation
 */
export function deleteAllAuthDescriptorsExceptMain(): Operation {
  return op("ft4.delete_all_auth_descriptors_except_main");
}
