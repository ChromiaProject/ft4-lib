import { Buffer } from "buffer";
import { BufferId, QueryObject, formatter } from "postchain-client";
import { OptionalLimit, OptionalPageCursor } from "@ft4/ft-session";
import { RawAnyAuthDescriptor, RateLimitResponse } from "@ft4/accounts";
import {
  TransferHistoryEntryResponse,
  TransferHistoryFilter,
  TransferHistoryType,
} from "./transfer-history";

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

export function accountsBySigner(
  id: BufferId,
  limit: OptionalLimit,
  cursor: OptionalPageCursor,
): QueryObject<
  { id: Buffer }[],
  { id: Buffer; page_size: OptionalLimit; page_cursor: OptionalPageCursor }
> {
  return {
    name: "ft4.get_accounts_by_signer",
    args: {
      id: formatter.ensureBuffer(id),
      page_size: limit,
      page_cursor: cursor,
    },
  };
}

export function accountsByAuthDescriptorId(
  id: BufferId,
  limit: OptionalLimit,
  cursor: OptionalPageCursor,
): QueryObject<
  Buffer[],
  {
    id: BufferId;
    page_size: OptionalLimit;
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

export function accountsByType(
  type: string,
  limit: OptionalLimit,
  cursor: OptionalPageCursor,
): QueryObject<
  Buffer[],
  {
    type: string;
    page_size: OptionalLimit;
    page_cursor: OptionalPageCursor;
  }
> {
  return {
    name: "ft4.get_accounts_by_type",
    args: {
      type,
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

export function accountAuthDescriptorsBySigner(
  accountId: BufferId,
  signer: BufferId,
): QueryObject<
  RawAnyAuthDescriptor[],
  {
    account_id: Buffer;
    signer: Buffer;
  }
> {
  return {
    name: "ft4.get_account_auth_descriptors_by_signer",
    args: {
      account_id: formatter.ensureBuffer(accountId),
      signer: formatter.ensureBuffer(signer),
    },
  };
}

export function accountAuthDescriptors(accountId: BufferId): QueryObject<
  RawAnyAuthDescriptor[],
  {
    id: Buffer;
  }
> {
  return {
    name: "ft4.get_account_auth_descriptors",
    args: {
      id: formatter.ensureBuffer(accountId),
    },
  };
}

export function accountMainAuthDescriptor(accountId: BufferId): QueryObject<
  RawAnyAuthDescriptor,
  {
    account_id: Buffer;
  }
> {
  return {
    name: "ft4.get_account_main_auth_descriptor",
    args: {
      account_id: formatter.ensureBuffer(accountId),
    },
  };
}

/**
 * Creates a query object for `ft4.get_account_auth_descriptor_by_id`-query
 * @param accountId - id of the account from which to get the auth descriptor
 * @param id - the id of the auth descriptor to get
 */
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

export function transferHistory(
  accountId: BufferId,
  filter: TransferHistoryFilter | null,
  limit: OptionalLimit,
  cursor: OptionalPageCursor = null,
): QueryObject<
  TransferHistoryEntryResponse[],
  {
    account_id: Buffer;
    filter: [TransferHistoryType | null];
    page_size: OptionalLimit;
    page_cursor: OptionalPageCursor;
  }
> {
  return {
    name: "ft4.get_transfer_history",
    args: {
      account_id: formatter.ensureBuffer(accountId),
      filter: [filter?.transferHistoryType ?? null],
      page_size: limit,
      page_cursor: cursor,
    },
  };
}
