import { Operation, QueryObject, RawGtv, formatter } from "postchain-client";
import { BufferId } from "/cryptoUtils";

export function nonce(
  accountId: BufferId,
  authDescriptorId: BufferId
): QueryObject<{ account_id: Buffer; auth_descriptor_id: Buffer }> {
  return {
    name: "ft4.get_auth_descriptor_nonce",
    args: {
      account_id: formatter.ensureBuffer(accountId),
      auth_descriptor_id: formatter.ensureBuffer(authDescriptorId),
    },
  };
}

export function loginConfig(
  configName?: string
): QueryObject<{ name?: string }> {
  return {
    name: "ft4.get_login_config",
    args: {
      name: configName,
    },
  };
}

export function authFlags(
  operation: Operation
): QueryObject<{ op_name: string; is_strict: boolean }> {
  return {
    name: "ft4.get_auth_flags",
    args: {
      op_name: operation.name,
      is_strict: true,
    },
  };
}

export function authMessageTemplate(
  operation: Operation
): QueryObject<{ op_name: string; op_args?: RawGtv[]; is_strict: boolean }> {
  return {
    name: "ft4.get_auth_message_template",
    args: {
      op_name: operation.name,
      op_args: operation.args,
      is_strict: true,
    },
  };
}
