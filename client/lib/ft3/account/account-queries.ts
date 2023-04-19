import { formatter } from "postchain-client";
import { Query, QueryObject } from "../utils/types";
import { BufferId } from "../../cryptoUtils";

export function accountAuthDescriptorsQuery(accountId: Buffer): Query {
  return ["ft3.get_account_auth_descriptors", { id: accountId }];
}

export function accountByIdQuery(id: Buffer): Query {
  return ["ft3.get_account_by_id", { id: id }];
}

export function accountsByParticipantIdQuery(id: Buffer): Query {
  return ["ft3.get_accounts_by_participant_id", { id: id }];
}

export function accountsByAuthDescriptorIdQuery(id: Buffer): Query {
  return ["ft3.get_accounts_by_auth_descriptor_id", { id: id }];
}

export function isAuthDescriptorValidQuery(
  accountId: Buffer,
  authDescId: Buffer
): Query {
  return [
    "ft3.is_auth_descriptor_valid",
    {
      account_id: accountId,
      auth_descriptor_id: authDescId,
    },
  ];
}

export function getRateLimitQuery(accountId: Buffer): Query {
  return [
    "ft3.get_account_rate_limit_last_update",
    {
      account_id: accountId,
    },
  ];
}

export function accountById(id: BufferId): QueryObject {
  return {
    name: "ft3.get_account_by_id",
    args: {
      id: formatter.ensureBuffer(id),
    },
  };
}

export function accountsByParticipantId(id: BufferId): QueryObject {
  return {
    name: "ft3.get_accounts_by_participant_id",
    args: {
      id: formatter.ensureBuffer(id),
    },
  };
}

export function accountsByAuthDescriptorId(id: BufferId): QueryObject {
  return {
    name: "ft3.get_accounts_by_auth_descriptor_id",
    args: {
      id: formatter.ensureBuffer(id),
    },
  };
}

export function isAuthDescriptorValid(
  accountId: BufferId,
  authDescriptorId: BufferId
): QueryObject {
  return {
    name: "ft3.is_auth_descriptor_valid",
    args: {
      account_id: formatter.ensureBuffer(accountId),
      auth_descriptor_id: formatter.ensureBuffer(authDescriptorId),
    },
  };
}

export function accountAuthDescriptors(accountId: BufferId): QueryObject {
  return {
    name: "ft3.get_account_auth_descriptors",
    args: {
      id: formatter.ensureBuffer(accountId),
    },
  };
}
