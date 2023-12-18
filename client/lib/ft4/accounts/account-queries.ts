import { Buffer } from "buffer";
import { QueryObject, formatter } from "postchain-client";
import { OptionalPageCursor } from "@ft4/types";
import { RateLimitResponse } from "./types";
import { RawAnyAuthDescriptor } from "@ft4/accounts/auth-descriptor/types";
import { BufferId } from "@ft4//utils/types";

export function RateLimitQuery(
  accountId: BufferId,
): QueryObject<RateLimitResponse, { account_id: Buffer }> {
  return {
    name: "ft4.get_account_rate_limit_last_update",
    args: {
      account_id: formatter.ensureBuffer(accountId),
    },
  };
}

export function accountById(
  id: BufferId,
): QueryObject<Buffer | null, { id: Buffer }> {
  return {
    name: "ft4.get_account_by_id",
    args: {
      id: formatter.ensureBuffer(id),
    },
  };
}

export function accountsByParticipantId(
  id: BufferId,
  limit: number,
  cursor: OptionalPageCursor,
): QueryObject<
  { id: Buffer }[],
  { id: Buffer; page_size: number; page_cursor: OptionalPageCursor }
> {
  return {
    name: "ft4.get_accounts_by_participant_id",
    args: {
      id: formatter.ensureBuffer(id),
      page_size: limit,
      page_cursor: cursor,
    },
  };
}

export function accountsByAuthDescriptorId(
  id: BufferId,
  limit: number,
  cursor: OptionalPageCursor,
): QueryObject<
  Buffer[],
  {
    id: BufferId;
    page_size: number;
    page_cursor: OptionalPageCursor;
  }
> {
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
  authDescriptorId: BufferId,
): QueryObject<boolean, { account_id: Buffer; auth_descriptor_id: Buffer }> {
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
  participantId: BufferId,
  limit: number,
  cursor: OptionalPageCursor = null,
): QueryObject<
  RawAnyAuthDescriptor[],
  {
    account_id: Buffer;
    participant_id: Buffer;
    page_size: number;
    page_cursor: OptionalPageCursor;
  }
> {
  return {
    name: "ft4.get_account_auth_descriptors_by_participant_id",
    args: {
      account_id: formatter.ensureBuffer(accountId),
      participant_id: formatter.ensureBuffer(participantId),
      page_size: limit,
      page_cursor: cursor,
    },
  };
}

export function accountAuthDescriptors(
  accountId: BufferId,
  limit: number,
  cursor: OptionalPageCursor = null,
): QueryObject<
  RawAnyAuthDescriptor,
  {
    id: Buffer;
    page_size: number;
    page_cursor: OptionalPageCursor;
  }
> {
  return {
    name: "ft4.get_account_auth_descriptors",
    args: {
      id: formatter.ensureBuffer(accountId),
      page_size: limit,
      page_cursor: cursor,
    },
  };
}

export function authDescriptorById(
  accountId: BufferId,
  id: BufferId,
): QueryObject<RawAnyAuthDescriptor, { account_id: Buffer; id: Buffer }> {
  return {
    name: "ft4.get_account_auth_descriptor_by_id",
    args: {
      account_id: formatter.ensureBuffer(accountId),
      id: formatter.ensureBuffer(id),
    },
  };
}
