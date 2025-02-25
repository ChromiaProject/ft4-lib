import { Buffer } from "buffer";
import { BufferId, QueryObject, formatter } from "postchain-client";
import { OptionalLimit, OptionalPageCursor } from "@ft4/ft-session";
import {
  RawAnyAuthDescriptor,
  RateLimitResponse,
  RateLimitStateResponse,
  AccountResponse,
  AuthDescriptorSignerResponse,
  AccountFilter,
  AccountAuthDescriptorFilter,
  MainAccountAuthDescriptorFilter,
  AuthDescriptorSignerFilter,
  RlStateFilter,
  AccountCreationTransferFilter,
  AccountCreationTransferResponse,
  AccountLinkFilter,
  AccountLinkResponse,
  SubscriptionFilter,
  SubscriptionResponse,
} from "@ft4/accounts";
import {
  TransferHistoryEntryResponse,
  TransferHistoryFilter,
  TransferHistoryType,
} from "./transfer-history";

/**
 *
 * Retrieves all accounts based on the selected filter of account_filter, paginated
 * @see utils.paged_result for information about pagination
 * @param {AccountFilter | null} accountFilter with indexed fileds from the account entity
 * @param {number | null} pageSize the size of the pages to retrieve
 * @param {string | null} pageCursor a pointer to where the page should start
 *
 * Available since ApiVersion 1
 */
export function accountsFiltered(
  accountFilter: AccountFilter,
  pageSize: OptionalLimit,
  pageCursor: OptionalPageCursor,
): QueryObject<
  { accounts: AccountResponse }[],
  {
    account_filter: [ids: Buffer[] | null, type: string | null] | null;
    page_size: OptionalLimit;
    page_cursor: OptionalPageCursor;
  }
> {
  return {
    name: "ft4.get_accounts_filtered",
    args: {
      account_filter: accountFilter
        ? [accountFilter?.ids ?? null, accountFilter?.type ?? null]
        : null,
      page_size: pageSize,
      page_cursor: pageCursor,
    },
  };
}

/**
 *
 * Retrieves all account_auth_descriptors based on the selected filter of account_auth_descriptor_filter, paginated
 * @see utils.paged_result for information about pagination
 * @param {AccountAuthDescriptorFilter | null} accountAuthDescriptorFilter with indexed fileds from the account_auth_descriptor entity
 * @param {number | null} pageSize the size of the pages to retrieve
 * @param {string | null} pageCursor a pointer to where the page should start
 *
 * Available since ApiVersion 1
 */
export function accountAuthDescriptorsFiltered(
  accountAuthDescriptorFilter: AccountAuthDescriptorFilter,
  pageSize: OptionalLimit,
  pageCursor: OptionalPageCursor,
): QueryObject<
  { accountAuthDescriptors: RawAnyAuthDescriptor }[],
  {
    account_auth_descriptor_filter:
      | [ids: Buffer[] | null, account_id: Buffer | null]
      | null;
    page_size: OptionalLimit;
    page_cursor: OptionalPageCursor;
  }
> {
  return {
    name: "ft4.get_account_auth_descriptors_filtered",
    args: {
      account_auth_descriptor_filter: accountAuthDescriptorFilter
        ? [
            accountAuthDescriptorFilter?.ids ?? null,
            accountAuthDescriptorFilter?.account_id ?? null,
          ]
        : null,
      page_size: pageSize,
      page_cursor: pageCursor,
    },
  };
}

/**
 *
 * Retrieves all main_auth_descriptors based on the selected filter of main_account_auth_descriptor_filter, paginated
 * @see utils.paged_result for information about pagination
 * @param {MainAccountAuthDescriptorFilter | null} mainAccountAuthDescriptorFilter with indexed fileds from the main_auth_descriptor entity
 * @param {number | null} pageSize the size of the pages to retrieve
 * @param {string | null} pageCursor a pointer to where the page should start
 *
 * Available since ApiVersion 1
 */
export function mainAuthDescriptorsFiltered(
  mainAccountAuthDescriptorFilter: MainAccountAuthDescriptorFilter,
  pageSize: OptionalLimit,
  pageCursor: OptionalPageCursor,
): QueryObject<
  { mainDescriptors: RawAnyAuthDescriptor }[],
  {
    main_account_auth_descriptor_filter:
      | [ids: Buffer[] | null, account_auth_descriptor_id: Buffer | null]
      | null;
    page_size: OptionalLimit;
    page_cursor: OptionalPageCursor;
  }
> {
  return {
    name: "ft4.get_main_auth_descriptors_filtered",
    args: {
      main_account_auth_descriptor_filter: mainAccountAuthDescriptorFilter
        ? [
            mainAccountAuthDescriptorFilter?.account_ids ?? null,
            mainAccountAuthDescriptorFilter?.account_auth_descriptor_id ?? null,
          ]
        : null,
      page_size: pageSize,
      page_cursor: pageCursor,
    },
  };
}

/**
 *
 * Retrieves all auth_descriptor_signers based on the selected filter of auth_descriptor_signer_filter, paginated
 * @see utils.paged_result for information about pagination
 * @param {AuthDescriptorSignerFilter | null} authDescriptorSignerFilter with indexed fileds from the auth_descriptor_signer entity
 * @param {number | null} pageSize the size of the pages to retrieve
 * @param {string | null} pageCursor a pointer to where the page should start
 *
 * Available since ApiVersion 1
 */
export function authDescriptorSignersFiltered(
  authDescriptorSignerFilter: AuthDescriptorSignerFilter,
  pageSize: OptionalLimit,
  pageCursor: OptionalPageCursor,
): QueryObject<
  { authDescriptorSigners: AuthDescriptorSignerResponse }[],
  {
    auth_descriptor_signer_filter:
      | [ids: Buffer[] | null, auth_descriptor_id: Buffer | null]
      | null;
    page_size: OptionalLimit;
    page_cursor: OptionalPageCursor;
  }
> {
  return {
    name: "ft4.get_auth_descriptor_signers_filtered",
    args: {
      auth_descriptor_signer_filter: authDescriptorSignerFilter
        ? [
            authDescriptorSignerFilter?.ids ?? null,
            authDescriptorSignerFilter?.auth_descriptor_id ?? null,
          ]
        : null,
      page_size: pageSize,
      page_cursor: pageCursor,
    },
  };
}

/**
 *
 * Retrieves all rl_states based on the selected filter of rl_state_filter, paginated
 * @see utils.paged_result for information about pagination
 * @param {RlStateFilter | null} rlStateFilter with indexed fileds from the rl_state entity
 * @param {number | null} pageSize the size of the pages to retrieve
 * @param {string | null} pageCursor a pointer to where the page should start
 *
 * Available since ApiVersion 1
 */
export function rlStatesFiltered(
  rlStateFilter: RlStateFilter,
  pageSize: OptionalLimit,
  pageCursor: OptionalPageCursor,
): QueryObject<
  { rlStates: RateLimitStateResponse }[],
  {
    rl_state_filter: [account_ids: Buffer[] | null] | null;
    page_size: OptionalLimit;
    page_cursor: OptionalPageCursor;
  }
> {
  return {
    name: "ft4.get_rl_states_filtered",
    args: {
      rl_state_filter: rlStateFilter
        ? [rlStateFilter?.account_ids ?? null]
        : null,
      page_size: pageSize,
      page_cursor: pageCursor,
    },
  };
}

/**
 *
 * Retrieves all account_creation_transfers based on the selected filter of account_creation_transfer_filter, paginated
 * @see utils.paged_result for information about pagination
 * @param {AccountCreationTransferFilter | null} accountCreationTransferFilter filter with indexed fileds from the account_creation_transfer entity
 * @param {number | null} pageSize the size of the pages to retrieve
 * @param {string | null} pageCursor a pointer to where the page should start
 *
 * Available since ApiVersion 1
 */
export function accountCreationTransfersFiltered(
  accountCreationTransferFilter: AccountCreationTransferFilter,
  pageSize: OptionalLimit,
  pageCursor: OptionalPageCursor,
): QueryObject<
  { accountCreationTransfers: AccountCreationTransferResponse }[],
  {
    account_creation_transfer_filter:
      | [
          rowids: number[] | null,
          transaction_tx_rid: Buffer | null,
          op_index: number | null,
          recipient_id: Buffer | null,
        ]
      | null;
    page_size: OptionalLimit;
    page_cursor: OptionalPageCursor;
  }
> {
  return {
    name: "ft4.get_account_creation_transfers_filtered",
    args: {
      account_creation_transfer_filter: accountCreationTransferFilter
        ? [
            accountCreationTransferFilter?.rowids ?? null,
            accountCreationTransferFilter?.transaction_tx_rid ?? null,
            accountCreationTransferFilter?.op_index ?? null,
            accountCreationTransferFilter?.recipient_id ?? null,
          ]
        : null,
      page_size: pageSize,
      page_cursor: pageCursor,
    },
  };
}

/**
 *
 * Retrieves all account_links based on the selected filter of account_link_filter, paginated
 * @see utils.paged_result for information about pagination
 * @param {AccountLinkFilter | null} accountLinkFilter filter with indexed fileds from the account_link entity
 * @param {number | null} pageSize the size of the pages to retrieve
 * @param {string | null} pageCursor a pointer to where the page should start
 *
 * Available since ApiVersion 1
 */
export function accountLinksFiltered(
  accountLinkFilter: AccountLinkFilter,
  pageSize: OptionalLimit,
  pageCursor: OptionalPageCursor,
): QueryObject<
  { accountCreationTransfers: AccountLinkResponse }[],
  {
    account_link_filter:
      | [
          account_ids: Buffer[] | null,
          secondary_id: Buffer | null,
          type: string | null,
        ]
      | null;
    page_size: OptionalLimit;
    page_cursor: OptionalPageCursor;
  }
> {
  return {
    name: "ft4.get_account_links_filtered",
    args: {
      account_link_filter: accountLinkFilter
        ? [
            accountLinkFilter?.account_ids ?? null,
            accountLinkFilter?.secondary_id ?? null,
            accountLinkFilter?.type ?? null,
          ]
        : null,
      page_size: pageSize,
      page_cursor: pageCursor,
    },
  };
}

/**
 *
 * Retrieves all subscriptions based on the selected filter of subscription_filter, paginated
 * @see utils.paged_result for information about pagination
 * @param {SubscriptionFilter | null} subscriptionFilter filter with indexed fileds from the subscription entity
 * @param {number | null} pageSize the size of the pages to retrieve
 * @param {string | null} pageCursor a pointer to where the page should start
 *
 * Available since ApiVersion 1
 */
export function subscriptionsFiltered(
  subscriptionFilter: SubscriptionFilter,
  pageSize: OptionalLimit,
  pageCursor: OptionalPageCursor,
): QueryObject<
  { subscriptions: SubscriptionResponse }[],
  {
    subscription_filter: [account_ids: Buffer[] | null] | null;
    page_size: OptionalLimit;
    page_cursor: OptionalPageCursor;
  }
> {
  return {
    name: "ft4.get_subscriptions_filtered",
    args: {
      subscription_filter: subscriptionFilter
        ? [subscriptionFilter?.account_ids ?? null]
        : null,
      page_size: pageSize,
      page_cursor: pageCursor,
    },
  };
}

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
): QueryObject<AccountResponse | null, { id: Buffer }> {
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
