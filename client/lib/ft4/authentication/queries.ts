import { Operation, QueryObject, RawGtv, formatter } from "postchain-client";
import { BufferId } from "/cryptoUtils";

export function authDataQuery(
  operation: Operation
): QueryObject<{ gtv?: RawGtv[] }> {
  return {
    name: `${operation.name}_auth_data`,
    args: {
      gtv: operation.args,
    },
  };
}

export const defaultFTAuthData: QueryObject<Record<string, never>> = {
  name: `ft4.default_auth_data`,
  args: {},
};

export function nonce(
  authDescriptorId: BufferId
): QueryObject<{ auth_descriptor_id: Buffer }> {
  return {
    name: "ft4.get_ctr_for_auth_descriptor",
    args: {
      auth_descriptor_id: formatter.ensureBuffer(authDescriptorId),
    },
  };
}

export function loginConfig(
  configName: string | null = null
): QueryObject<{ name: string }> {
  return {
    name: "ft4.get_login_config",
    args: {
      name: configName,
    },
  };
}
