import { QueryObject, formatter } from "postchain-client";
import { BufferId } from "../../cryptoUtils";
import { OptionalPageCursor } from "../types";
import { Buffer } from "buffer";

export function getRateLimit(
  accountId: BufferId
): QueryObject<{ account_id: Buffer }> {
  return {
    name: "ft4.get_account_rate_limit_last_update",
    args: {
      account_id: formatter.ensureBuffer(accountId),
    },
  };
}

export function accountById(id: BufferId): QueryObject<{ id: Buffer }> {
  return {
    name: "ft4.get_account_by_id",
    args: {
      id: formatter.ensureBuffer(id),
    },
  };
}

export function accountsByParticipantId(
  id: BufferId
): QueryObject<{ id: Buffer }> {
  return {
    name: "ft4.get_accounts_by_participant_id",
    args: {
      id: formatter.ensureBuffer(id),
    },
  };
}

export function accountsByAuthDescriptorId(
  id: BufferId,
  limit: number,
  cursor: OptionalPageCursor
): QueryObject<{
  id: BufferId;
  page_size: number;
  page_cursor: OptionalPageCursor;
}> {
  return {
    name: "ft4.get_accounts_by_auth_descriptor_id",
    args: {
      id: formatter.ensureBuffer(id),
      page_size: limit,
      page_cursor: cursor,
    },
  };
}

export function isAuthDescriptorValid(
  accountId: BufferId,
  authDescriptorId: BufferId
): QueryObject<{ account_id: Buffer; auth_descriptor_id: Buffer }> {
  return {
    name: "ft4.is_auth_descriptor_valid",
    args: {
      account_id: formatter.ensureBuffer(accountId),
      auth_descriptor_id: formatter.ensureBuffer(authDescriptorId),
    },
  };
}

export function accountAuthDescriptorsByParticipantId(
  accountId: BufferId,
  participantId: BufferId
): QueryObject<{ account_id: Buffer; participant_id: Buffer }> {
  return {
    name: "ft4.get_account_auth_descriptors_by_participant_id",
    args: {
      account_id: formatter.ensureBuffer(accountId),
      participant_id: formatter.ensureBuffer(participantId),
    },
  };
}

export function accountAuthDescriptors(
  accountId: BufferId,
  limit: number,
  cursor: OptionalPageCursor = null
): QueryObject<{ id: Buffer; page_size: number; page_cursor: string }> {
  return {
    name: "ft4.get_account_auth_descriptors",
    args: {
      id: formatter.ensureBuffer(accountId),
      page_size: limit,
      page_cursor: cursor,
    },
  };
}
