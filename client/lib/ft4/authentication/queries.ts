import { Operation, QueryObject, RawGtv, formatter } from "postchain-client";
import { LoginConfig } from "./login-manager/";
import { BufferId } from "@ft4/utils";

export function nonce(
  accountId: BufferId,
  authDescriptorId: BufferId,
): QueryObject<
  number | null,
  { account_id: Buffer; auth_descriptor_id: Buffer }
> {
  return {
    name: "ft4.get_auth_descriptor_nonce",
    args: {
      account_id: formatter.ensureBuffer(accountId),
      auth_descriptor_id: formatter.ensureBuffer(authDescriptorId),
    },
  };
}

export function loginConfig(
  configName?: string,
): QueryObject<LoginConfig, { name?: string }> {
  return {
    name: "ft4.get_login_config",
    args: {
      name: configName,
    },
  };
}

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
