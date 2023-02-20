import { QueryObject } from "postchain-client/built/src/restclient/types";

export function accountAuthDescriptorsQuery(accountId: Buffer): QueryObject {
  return { type: "ft3.get_account_auth_descriptors", id: accountId };
}

export function accountByIdQuery(id: Buffer): QueryObject {
  return { type: "ft3.get_account_by_id", id: id };
}

export function accountsByParticipantIdQuery(id: Buffer): QueryObject {
  return { type: "ft3.get_accounts_by_participant_id", id: id };
}

export function accountsByAuthDescriptorIdQuery(id: Buffer): QueryObject {
  return { type: "ft3.get_accounts_by_auth_descriptor_id", id: id };
}

export function isAuthDescriptorValidQuery(
  accountId: Buffer,
  authDescId: Buffer
): QueryObject {
  return {
    type: "ft3.is_auth_descriptor_valid",
    account_id: accountId,
    auth_descriptor_id: authDescId,
  };
}

export function getRateLimitQuery(accountId: Buffer): QueryObject {
  return {
    type: "ft3.get_account_rate_limit_last_update",
    account_id: accountId,
  };
}
