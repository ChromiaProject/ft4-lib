import { Operation, QueryObject, RawGtv, formatter } from "postchain-client";
import { Buffer } from "buffer";
import { BufferId } from "@ft4/utils";

/**
 * Creates a query object that can be used to call the `ft4.get_auth_descriptor_counter`- query
 * @param accountId - the id of the account of which to get the counter
 * @param authDescriptorId - the id of the auth descriptor of which to get the counter
 * @returns the counter value or null if it was not found
 */
export function authDescriptorCounter(
  accountId: BufferId,
  authDescriptorId: BufferId,
): QueryObject<
  number | null,
  { account_id: Buffer; auth_descriptor_id: Buffer }
> {
  return {
    name: "ft4.get_auth_descriptor_counter",
    args: {
      account_id: formatter.ensureBuffer(accountId),
      auth_descriptor_id: formatter.ensureBuffer(authDescriptorId),
    },
  };
}

/**
 * Retrieves the required auth flags for the specified operation
 * @param operation - the operation to get flags for
 * @returns list of required flags, or empty list if no specific flags are required
 */
export function authFlags(
  operation: Operation,
): QueryObject<string[], { op_name: string }> {
  return {
    name: "ft4.get_auth_flags",
    args: {
      op_name: operation.name,
    },
  };
}

/**
 * Retrieves the template for the auth message for a specific operation
 * @param operation - the operation to get the message template for
 * @returns the message template
 */
export function authMessageTemplate(
  operation: Operation,
): QueryObject<string, { op_name: string; op_args?: RawGtv[] }> {
  return {
    name: "ft4.get_auth_message_template",
    args: {
      op_name: operation.name,
      op_args: operation.args,
    },
  };
}
