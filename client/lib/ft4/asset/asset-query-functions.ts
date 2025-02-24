import {
  balanceByAccountId,
  assetById,
  balancesByAccountId,
  allAssets,
  assetsBySymbol,
  assetsByName,
  assetsByType,
  assetDetailsForCrosschainRegistration,
  assetsFiltered,
  balancesFiltered,
  transferHistoryEntriesFiltered,
  crossChainTransferHistoryEntriesFiltered,
} from "./asset-queries";
import {
  Asset,
  AssetFilter,
  AssetResponse,
  Balance,
  BalanceFilter,
  BalanceResponse,
  CrosschainAssetRegistration,
  CrosschainAssetRegistrationResponse,
  CrosschainTransferHistoryEntryFilter,
  TransferHistoryEntryFilter,
} from "./types";
import { OptionalLimit, OptionalPageCursor } from "@ft4/ft-session";
import { PaginatedEntity, retrievePaginatedEntity } from "@ft4/utils";
import { createAmountFromBalance } from "./amount";
import { BufferId, Queryable } from "postchain-client";
import {
  TransferHistoryEntry,
  TransferHistoryEntryResponse,
} from "@ft4/accounts";
import {
  createTransferHistoryEntryFromResponse,
  CrosschainTransferHistoryEntry,
  CrosschainTransferHistoryEntryResponse,
} from "@ft4/accounts/transfer-history";

/**
 * Retrieves asset information using its id
 * @param queryable - object to use when querying the blockchain
 * @param id - the id of the asset to fetch
 * @returns The asset details, or null if no asset with the specified id was found
 */
export async function getAssetById(
  queryable: Queryable,
  id: BufferId,
): Promise<Asset | null> {
  const response = await queryable.query(assetById(id));
  return response ? createAssetObject(response) : null;
}

/**
 * Retrieves asset information using its symbol. As there can be multiple assets with the same symbol,
 * the information is returned as a paginated entity.
 * @param queryable - object to use when querying the blockchain
 * @param symbol - the symbol of the asset to fetch
 * @param limit - maximum page size
 * @param cursor - where the page should start
 */
export async function getAssetsBySymbol(
  queryable: Queryable,
  symbol: string,
  limit: OptionalLimit = null,
  cursor: OptionalPageCursor = null,
): Promise<PaginatedEntity<Asset>> {
  return retrievePaginatedEntity<Asset, AssetResponse>(
    queryable,
    assetsBySymbol(symbol, limit, cursor),
    (assets) => assets.map(createAssetObject),
  );
}

/**
 * Retrieves asset information using its name. As there can be multiple assets with the same name,
 * the information is returned as a paginated entity.
 * @param queryable - object to use when querying the blockchain
 * @param name - the name of the asset to fetch
 * @param limit - maximum page size
 * @param cursor - where the page should start
 */
export function getAssetsByName(
  queryable: Queryable,
  name: string,
  limit: OptionalLimit = null,
  cursor: OptionalPageCursor = null,
): Promise<PaginatedEntity<Asset>> {
  return retrievePaginatedEntity<Asset, AssetResponse>(
    queryable,
    assetsByName(name, limit, cursor),
    (a) => a.map(createAssetObject),
  );
}

/**
 * Retrieves all assets of a specific type, e.g., `"ft4"`, as a paginated entity
 * @param queryable - object to use when querying the blockchain
 * @param type - the type of assets to return
 * @param limit - maximum page size
 * @param cursor - where the page should start
 */
export async function getAssetsByType(
  queryable: Queryable,
  type: string,
  limit: OptionalLimit = null,
  cursor: OptionalPageCursor = null,
): Promise<PaginatedEntity<Asset>> {
  return retrievePaginatedEntity<Asset, AssetResponse>(
    queryable,
    assetsByType(type, limit, cursor),
    (a) => a.map(createAssetObject),
  );
}

/**
 * Retrieves all assets that are registered on a blockchain as a paginated entity
 * @param queryable - object to use when querying the blockchain
 * @param limit - maximum page size
 * @param cursor - where the page should start
 */
export async function getAllAssets(
  queryable: Queryable,
  limit: OptionalLimit = null,
  cursor: OptionalPageCursor = null,
): Promise<PaginatedEntity<Asset>> {
  return retrievePaginatedEntity<Asset, AssetResponse>(
    queryable,
    allAssets(limit, cursor),
    (a) => a.map(createAssetObject),
  );
}

/**
 * Retrieves the balance of a specific asset on the provided account
 * @param queryable - object to use when querying the blockchain
 * @param accountId - the account on which to get the balance
 * @param assetId - the asset for which to get the balance
 * @returns The current account balance of the specified asset. Or null if account does not have the asset
 */
export async function getBalanceByAccountId(
  queryable: Queryable,
  accountId: BufferId,
  assetId: BufferId,
): Promise<Balance | null> {
  return await queryable
    .query(balanceByAccountId(accountId, assetId))
    .then((res) => (res !== null ? createBalanceObject(res) : res));
}

/**
 * Fetches the details of a crosschain asset, i.e., an asset that was registered
 * on this chain but which has a different issuing chain.
 * @param queryable - object to use when querying the blockchain
 * @param assetId - the id of the asset to fetch details for
 */
export async function getAssetDetailsForCrosschainRegistration(
  queryable: Queryable,
  assetId: BufferId,
): Promise<CrosschainAssetRegistration> {
  return queryable
    .query(assetDetailsForCrosschainRegistration(assetId))
    .then(createCrosschainAssetRegistrationObject);
}

/**
 * Fetches all balances for a specified account as a paginated entity
 * @param queryable - the client to use to query the blockchain
 * @param accountId - the id of the account to fetch balances for
 * @param limit - maximum page size
 * @param cursor - where the page should start
 */
export async function getBalancesByAccountId(
  queryable: Queryable,
  accountId: BufferId,
  limit: OptionalLimit = null,
  cursor: OptionalPageCursor = null,
): Promise<PaginatedEntity<Balance>> {
  return retrievePaginatedEntity<Balance, BalanceResponse>(
    queryable,
    balancesByAccountId(accountId, limit, cursor),
    (balances) => balances.map(createBalanceObject),
  );
}

/**
 * Retrieves all assets based on the filtering options provided in AssetFilter and
 * that are registered on a blockchain as a paginated entity
 *
 * @param queryable - object to use when querying the blockchain
 * @param assetFilter - object of AssetFilter that can be list of id, name, symbol and type
 * @param limit - maximum page size
 * @param cursor - where the page should start
 *
 * Available since ApiVersion 1
 */
export async function getAssetsFiltered(
  queryable: Queryable,
  assetFilter: AssetFilter | null = null,
  limit: OptionalLimit = null,
  cursor: OptionalPageCursor = null,
): Promise<PaginatedEntity<Asset>> {
  return retrievePaginatedEntity<Asset, AssetResponse>(
    queryable,
    assetsFiltered(assetFilter, limit, cursor),
    (assets) => assets.map(createAssetObject),
  );
}

/**
 * Retrieves all balances based on the filtering options provided in BalanceFilter and
 * that are registered on a blockchain as a paginated entity
 *
 * @param queryable - object to use when querying the blockchain
 * @param balanceFilter - object of BalanceFilter that can be list of account_id and asset_id
 * @param limit - maximum page size
 * @param cursor - where the page should start
 *
 * Available since ApiVersion 1
 */
export async function getBalancesFiltered(
  queryable: Queryable,
  balanceFilter: BalanceFilter | null = null,
  limit: OptionalLimit = null,
  cursor: OptionalPageCursor = null,
): Promise<PaginatedEntity<Balance>> {
  return retrievePaginatedEntity<Balance, BalanceResponse>(
    queryable,
    balancesFiltered(balanceFilter, limit, cursor),
    (balances) => balances.map(createBalanceObject),
  );
}

/**
 * Retrieves all transfer history entries based on the filtering options provided in TransferHistoryEntryFilter
 * as a paginated entity
 *
 * @param queryable - object to use when querying the blockchain
 * @param transferHistoryEntryFilter - object of TransferHistoryEntryFilter that can be list of,
 * account_id, asset_id, transaction_rid and op_index
 * @param limit - maximum page size
 * @param cursor - where the page should start
 *
 * Available since ApiVersion 1
 */
export async function getTransferHistoryEntriesFiltered(
  queryable: Queryable,
  transferHistoryEntryFilter: TransferHistoryEntryFilter | null = null,
  limit: OptionalLimit = null,
  cursor: OptionalPageCursor = null,
): Promise<PaginatedEntity<TransferHistoryEntry>> {
  return retrievePaginatedEntity<
    TransferHistoryEntry,
    TransferHistoryEntryResponse
  >(
    queryable,
    transferHistoryEntriesFiltered(transferHistoryEntryFilter, limit, cursor),
    (transferHistoryEntries) =>
      transferHistoryEntries.map(createTransferHistoryEntryFromResponse),
  );
}

/**
 * Retrieves all crosschain transfer history entries based on the filtering options provided in CrosschainTransferHistoryEntryFilter
 * as a paginated entity
 *
 * @param queryable - object to use when querying the blockchain
 * @param crosschainTransferHistoryEntryFilter - object of CrosschainTransferHistoryEntryFilter that can be
 * list of, account_id, asset_id, transaction_rid and op_index
 * @param limit - maximum page size
 * @param cursor - where the page should start
 *
 * Available since ApiVersion 1
 */
export async function getCrosschainTransferHistoryEntriesFiltered(
  queryable: Queryable,
  crosschainTransferHistoryEntryFilter: CrosschainTransferHistoryEntryFilter | null = null,
  limit: OptionalLimit = null,
  cursor: OptionalPageCursor = null,
): Promise<PaginatedEntity<CrosschainTransferHistoryEntry>> {
  return retrievePaginatedEntity<
    CrosschainTransferHistoryEntry,
    CrosschainTransferHistoryEntryResponse
  >(
    queryable,
    crossChainTransferHistoryEntriesFiltered(
      crosschainTransferHistoryEntryFilter,
      limit,
      cursor,
    ),
    (crosschainHistoryTransferEntries) =>
      crosschainHistoryTransferEntries.map(
        createCrosschainTransferHistoryEntryObject,
      ),
  );
}

export function createBalanceObject(balance: BalanceResponse): Balance {
  return Object.freeze({
    asset: createAssetObject(balance.asset),
    amount: createAmountFromBalance(balance.amount, balance.asset.decimals),
  });
}

/**
 * Converts an `AssetResponse` object, returned from the blockchain to an `Asset` object
 * which can be used in the dApp
 * @param asset - the object to convert
 */
export function createAssetObject(asset: AssetResponse): Asset {
  return Object.freeze({
    id: asset.id,
    name: asset.name,
    symbol: asset.symbol,
    decimals: asset.decimals,
    blockchainRid: asset.blockchain_rid,
    iconUrl: asset.icon_url,
    type: asset.type,
    supply: asset.supply,
  });
}

function createCrosschainAssetRegistrationObject(
  asset: CrosschainAssetRegistrationResponse,
): CrosschainAssetRegistration {
  return Object.freeze({
    id: asset.id,
    name: asset.name,
    symbol: asset.symbol,
    decimals: asset.decimals,
    blockchainRid: asset.blockchain_rid,
    iconUrl: asset.icon_url,
    type: asset.type,
    uniquenessResolver: asset.uniqueness_resolver,
  });
}

/**
 * Converts a `CrosschainTransferHistoryEntryResponse` object, returned from the blockchain to a `CrosschainTransferHistoryEntry` object
 * which can be used in the dApp
 * @param crosschainTransferHistoryEntry - the object to convert
 */
export function createCrosschainTransferHistoryEntryObject(
  crosschainTransferHistoryEntry: CrosschainTransferHistoryEntryResponse,
): CrosschainTransferHistoryEntry {
  return Object.freeze({
    rowid: crosschainTransferHistoryEntry.rowid,
    blockchainRid: crosschainTransferHistoryEntry.blockchain_rid,
    accountId: crosschainTransferHistoryEntry.account_id,
    assetId: crosschainTransferHistoryEntry.asset_id,
    delta: crosschainTransferHistoryEntry.delta,
    isInput: crosschainTransferHistoryEntry.is_input,
    opIndex: crosschainTransferHistoryEntry.op_index,
    transactionId: crosschainTransferHistoryEntry.transaction_rid,
  });
}
