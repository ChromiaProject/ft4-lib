import { Buffer } from "buffer";
import { formatter, IClient, QueryObject } from "postchain-client";
import {
  getBalanceByAccountId,
  getBalancesByAccountId,
} from "../asset/asset-query-functions";
import { Connection, OptionalPageCursor } from "../types";
import { getConfig } from "@ft4/utils/index";
import { retrievePaginatedEntity } from "@ft4/utils/entity-retriever";
import { BufferId, PaginatedEntity } from "@ft4/utils/types";
import * as Query from "./account-queries";
import {
  accountAuthDescriptors,
  accountAuthDescriptorsBySigner,
  accountById,
  accountsByAuthDescriptorId,
  accountsBySigner,
  RateLimitQuery,
  transferHistory,
} from "./account-queries";
import {
  TransferHistoryEntry,
  TransferHistoryEntryResponse,
  TransferHistoryFilter,
} from "./transfer-history/types";
import { Account, RateLimit } from "./types";
import { AnyAuthDescriptor } from "@ft4/accounts/auth-descriptor";
import {
  AuthDescriptorSimpleRule,
  RawAnyAuthDescriptor,
  RuleOperator,
  RuleVariable,
} from "./auth-descriptor/types";
import {
  PendingTransfer,
  PendingTransferResponse,
  pendingTransfersForAccount,
} from "../crosschain";
import { mapPendingTransfers } from "../crosschain/query-functions";
import { mapAuthDescriptorsFromGtv } from "./auth-descriptor/gtv";
import { createTransferHistoryEntryFromResponse } from "./transfer-history/transfer-history-entry";

//this will be outdated as soon as another tx is sent to the same account:
//does it make sense for the users to have it? Who needs this info?
export async function getRateLimit(
  session: IClient,
  accountId: BufferId,
): Promise<RateLimit> {
  const rateLimitResponse = await session.query(RateLimitQuery(accountId));
  const rateLimit = {
    points: rateLimitResponse.points,
    lastUpdate: new Date(rateLimitResponse.lastUpdate),
  };

  const chainInfo = await getConfig(session);

  return Object.freeze({
    points: rateLimit.points,
    lastUpdate: rateLimit.lastUpdate,
    getAvailablePoints: () => {
      if (chainInfo.rateLimit.active) {
        const deltaTime = Date.now() - rateLimitResponse.lastUpdate;
        const points =
          rateLimit.points + deltaTime / chainInfo.rateLimit.recoveryTime;
        return Math.min(points, chainInfo.rateLimit.maxPoints);
      }
      return null;
    },
  });
}

export function createAccountObject(
  connection: Connection,
  accountId: BufferId,
): Account {
  return Object.freeze({
    id: formatter.ensureBuffer(accountId),
    blockchainRid: formatter.toBuffer(connection.client.config.blockchainRid),
    getBalanceByAssetId: (assetId: BufferId) =>
      getBalanceByAccountId(connection, accountId, assetId),
    getBalances: (limit = 100, cursor: OptionalPageCursor = null) =>
      getBalancesByAccountId(connection, accountId, limit, cursor),
    isAuthDescriptorValid: (authDescriptorId: BufferId) =>
      isAuthDescriptorValid(connection, accountId, authDescriptorId),
    getAuthDescriptors: (
      includeInactive = true,
      limit = 100,
      cursor: OptionalPageCursor = null,
    ) =>
      getAuthDescriptors(connection, accountId, includeInactive, limit, cursor),
    getAuthDescriptorsBySigner: (
      signer: BufferId,
      includeInactive = true,
      limit = 100,
      cursor: OptionalPageCursor = null,
    ) =>
      getAuthDescriptorsBySigner(
        connection,
        accountId,
        signer,
        includeInactive,
        limit,
        cursor,
      ),
    getRateLimit: () => getRateLimit(connection.client, accountId),
    getTransferHistory: async (
      limit = 100,
      filter: TransferHistoryFilter = {},
      cursor: OptionalPageCursor = null,
    ) => {
      return retrievePaginatedEntity<
        TransferHistoryEntry,
        TransferHistoryEntryResponse
      >(
        connection,
        transferHistory(accountId, filter, limit, cursor),
        (entries) =>
          entries.map((entry) => createTransferHistoryEntryFromResponse(entry)),
      );
    },
    getTransferHistoryEntry: async (rowid: number) => {
      return createTransferHistoryEntryFromResponse(
        await connection.query("ft4.get_transfer_history_entry", { rowid }),
      );
    },
    getPendingCrosschainTransfers: async (
      limit = 100,
      cursor: OptionalPageCursor = null,
    ) => {
      return retrievePaginatedEntity<PendingTransfer, PendingTransferResponse>(
        connection,
        pendingTransfersForAccount(accountId, limit, cursor),
        mapPendingTransfers,
      );
    },
  });
}

export async function getById(
  connection: Connection,
  id: BufferId,
): Promise<Account | null> {
  const accountId = await connection.query(accountById(id));

  return accountId && createAccountObject(connection, accountId);
}

export async function getBySigner(
  connection: Connection,
  id: BufferId,
  limit = 100,
  cursor: OptionalPageCursor = null,
): Promise<PaginatedEntity<Account>> {
  return retrievePaginatedEntity<Account, { id: Buffer }>(
    connection,
    accountsBySigner(id, limit, cursor),
    (accounts) =>
      accounts.map((acc) => createAccountObject(connection, acc.id)),
  );
}

export async function getByAuthDescriptorId(
  connection: Connection,
  id: BufferId,
  limit = 100,
  cursor: OptionalPageCursor = null,
): Promise<PaginatedEntity<Account>> {
  return retrievePaginatedEntity<Account, Buffer>(
    connection,
    accountsByAuthDescriptorId(id, limit, cursor),
    (accounts) => accounts.map((acc) => createAccountObject(connection, acc)),
  );
}

export async function isAuthDescriptorValid(
  connection: Connection,
  accountId: BufferId,
  authDescriptorId: BufferId,
): Promise<boolean> {
  return (await connection.query(
    Query.isAuthDescriptorValid(accountId, authDescriptorId),
  ))!;
}

export async function getAuthDescriptorsBySigner(
  connection: Connection,
  accountId: BufferId,
  signer: BufferId,
  includeInactive = true,
  limit = 100,
  cursor: OptionalPageCursor = null,
): Promise<PaginatedEntity<AnyAuthDescriptor>> {
  return await retrieveAuthDescriptorsAndFilterOutInactivesIfNeeded(
    connection,
    (l, c) => accountAuthDescriptorsBySigner(accountId, signer, l, c),
    includeInactive,
    limit,
    cursor,
  );
}

export async function getAuthDescriptors(
  connection: Connection,
  accountId: BufferId,
  includeInactive = true,
  limit = 100,
  cursor: OptionalPageCursor = null,
): Promise<PaginatedEntity<AnyAuthDescriptor>> {
  return await retrieveAuthDescriptorsAndFilterOutInactivesIfNeeded(
    connection,
    (l, c) => accountAuthDescriptors(accountId, l, c),
    includeInactive,
    limit,
    cursor,
  );
}

async function retrieveAuthDescriptorsAndFilterOutInactivesIfNeeded(
  connection: Connection,
  query: (
    limit: number,
    cursor: OptionalPageCursor,
  ) => QueryObject<RawAnyAuthDescriptor[], any>,
  includeInactive = true,
  limit = 100,
  cursor: OptionalPageCursor = null,
) {
  let currCursor = cursor;
  const retrievePage = async () => {
    const pg = await retrievePaginatedEntity<
      AnyAuthDescriptor,
      RawAnyAuthDescriptor
    >(
      connection,
      query(includeInactive ? limit : 100, currCursor),
      (authDescriptors) =>
        authDescriptors ? mapAuthDescriptorsFromGtv(authDescriptors) : [],
    );
    currCursor = pg.nextCursor;
    return pg.data;
  };

  let data = await retrievePage();
  if (!includeInactive) {
    let currentHeight: number;

    const getBlockHeight = async () => {
      if (currentHeight === undefined) {
        const blocks = await connection.client.getBlocksInfo(1);
        currentHeight = blocks[0].height;
      }
      return currentHeight;
    };

    data = await Promise.all(data.filter((ad) => isActive(ad, getBlockHeight)));

    while (data.length < limit && currCursor !== null) {
      const newData = (await retrievePage()).filter((ad) =>
        isActive(ad, getBlockHeight),
      );
      data.push(...newData);
    }
  }
  return {
    data: data.slice(0, limit),
    nextCursor: currCursor,
  };
}

async function isActive(
  ad: AnyAuthDescriptor,
  getBlockHeight: () => Promise<number>,
): Promise<boolean> {
  if (ad.rules === null) return true;

  const isRuleActive = async (rule: AuthDescriptorSimpleRule) => {
    let variable;
    if (rule.variable === RuleVariable.BlockHeight) {
      variable = await getBlockHeight();
    } else if (rule.variable === RuleVariable.BlockTime) {
      variable = Date.now();
    } else {
      // maybe add query?
      return true;
    }

    if (rule.operator === RuleOperator.Equals) {
      return variable === rule.value;
    } else if (rule.operator === RuleOperator.GreaterOrEqual) {
      return variable >= rule.value;
    } else if (rule.operator === RuleOperator.GreaterThan) {
      return variable > rule.value;
    } else if (rule.operator === RuleOperator.LessOrEqual) {
      return variable <= rule.value;
    } else {
      return variable < rule.value;
    }
  };

  if (ad.rules.operator === "and") {
    return (await Promise.all(ad.rules.rules.map(isRuleActive))).every(Boolean);
  } else {
    return await isRuleActive(ad.rules);
  }
}
