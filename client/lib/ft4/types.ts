import { Account, AuthenticatedAccount } from "./accounts/types";
import { Asset } from "./asset/types";
import { BufferId, Config, PaginatedEntity } from "@ft4/utils/types";
import { TransactionBuilder } from "@ft4/utils/transaction-builder";
import {
  IClient,
  Queryable,
  Operation,
  TransactionReceipt,
} from "postchain-client";
import { LoginManger, LoginKeyStore } from "./authentication/login-manager";
import { TransferDetail } from "./accounts/transfer-history/transfer-history-query-functions";

export type PageCursor = string;
export type OptionalPageCursor = PageCursor | null;
export type PagedResponse<T> = {
  data: T[];
  next_cursor: OptionalPageCursor;
};

export interface Connection extends Queryable {
  client: IClient;
  getConfig: () => Promise<Config>;
  getVersion: () => Promise<string>;

  getAccountById: (accountId: BufferId) => Promise<Account | null>;
  getAccountsBySigner: (
    signer: BufferId,
    limit?: number,
    cursor?: OptionalPageCursor,
  ) => Promise<PaginatedEntity<Account>>;
  getAccountsByAuthDescriptorId: (
    id: BufferId,
    limit?: number,
    cursor?: OptionalPageCursor,
  ) => Promise<PaginatedEntity<Account>>;

  getAssetById: (assetId: BufferId) => Promise<Asset | null>;
  getAssetBySymbol: (symbol: string) => Promise<Asset | null>;
  getAssetsByName: (
    name: string,
    limit?: number,
    cursor?: OptionalPageCursor,
  ) => Promise<PaginatedEntity<Asset>>;
  getAllAssets: (
    limit?: number,
    cursor?: OptionalPageCursor,
  ) => Promise<PaginatedEntity<Asset>>;
  getTransferDetails: (
    txRid: BufferId,
    opIndex: number,
  ) => Promise<TransferDetail[]>;
  getTransferDetailsByAsset: (
    txRid: BufferId,
    opIndex: number,
    assetId: BufferId,
  ) => Promise<TransferDetail[]>;
}

export interface Session extends Connection {
  account: AuthenticatedAccount;
  call: (...operations: Operation[]) => Promise<TransactionReceipt>;
  callWithoutNop: (...operations: Operation[]) => Promise<TransactionReceipt>;
  transactionBuilder: () => TransactionBuilder;
}

export type KeyStoreInteractor = {
  /**
   * Retrieves a list of Accounts associated with the signer. At most MAX_PAGE_SIZE.
   * To fetch more Accounts, use @see getAccountsPaginated
   */
  getAccounts(): Promise<Account[]>;
  getAccountsPaginated(
    limit: number,
    cursor: OptionalPageCursor,
  ): Promise<PaginatedEntity<Account>>;
  getSession(accountId: BufferId): Promise<Session>;
  getLoginManager(loginKeyStore?: LoginKeyStore): LoginManger;
  onKeyStoreChanged(callback: (newKeyStore: KeyStoreInteractor) => void): void;
};
