import { Buffer } from "buffer";
import { AuthHandler } from "@ft4/authentication";
import {
  BufferId,
  DictPair,
  QueryObject,
  RawGtv,
  formatter,
} from "postchain-client";

export function rellAppStructure(): QueryObject<{
  modules: Record<string, DictPair>;
}> {
  return {
    name: "rell.get_app_structure",
    args: {},
  };
}

export function allAuthHandlers(): QueryObject<AuthHandler[]> {
  return {
    name: "ft4.get_all_auth_handlers",
  };
}

/**
 * Fetches the auth handler for the specified operation, or null if there is no
 * auth handler associated with this operation.
 * @param opName - the name of the operation
 */
export function authHandlerForOperation(
  opName: string,
): QueryObject<AuthHandler | null, { op_name: string }> {
  return {
    name: "ft4.get_auth_handler_for_operation",
    args: {
      op_name: opName,
    },
  };
}

export function firstAllowedAuthDescriptorBySigners(
  opName: string,
  args: RawGtv,
  accountId: Buffer,
  signers: Buffer[],
): QueryObject<
  Buffer | null,
  { op_name: string; args: RawGtv; account_id: Buffer; signers: Buffer[] }
> {
  return {
    name: "ft4.get_first_allowed_auth_descriptor_by_signers",
    args: {
      op_name: opName,
      args,
      account_id: accountId,
      signers,
    },
  };
}

/**
 * Finds the first auth descriptor from a list of auth descriptors
 * which will be allowed to perform the specified operation on the account.
 * @param opName - the name of the operation to perform
 * @param args - the args which will be passed to the operation
 * @param accountId - the account with which the auth descriptor is associated
 * @param ids - list of auth descriptor ids to select from
 */
export function firstAllowedAuthDescriptor(
  opName: string,
  args: RawGtv,
  accountId: BufferId,
  ids: BufferId[],
): QueryObject<
  Buffer | null,
  { op_name: string; args: RawGtv; account_id: Buffer; ad_ids: Buffer[] }
> {
  return {
    name: "ft4.get_first_allowed_auth_descriptor",
    args: {
      op_name: opName,
      args,
      account_id: formatter.ensureBuffer(accountId),
      ad_ids: ids.map(formatter.ensureBuffer),
    },
  };
}
