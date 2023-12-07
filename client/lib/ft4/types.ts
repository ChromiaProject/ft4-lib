import { Account, AuthenticatedAccount } from "./accounts/types";
import { Asset } from "./asset/types";
import { BufferId, Config, PaginatedEntity } from "./utils/types";
import { TransactionBuilder } from "./utils/transaction-builder";
import {
  IClient,
  Queryable,
  Operation,
  TransactionReceipt,
} from "postchain-client";
import { LoginKeyStore, LoginManager } from "./authentication/login-manager";

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
  getAccountsByParticipantId: (
    participantId: BufferId,
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
}

export interface Session extends Connection {
  account: AuthenticatedAccount;
  call: (...operations: Operation[]) => Promise<TransactionReceipt>;
  callWithoutNop: (...operations: Operation[]) => Promise<TransactionReceipt>;
  transactionBuilder: () => TransactionBuilder;
}

export type KeyStoreInteractor = {
  /**
   * Retrieves a list of Accounts associated with the pubkey. At most MAX_PAGE_SIZE.
   * To fetch more Accounts, use @see getAccountsPaginated
   */
  getAccounts(): Promise<Account[]>;
  getAccountsPaginated(
    limit: number,
    cursor: OptionalPageCursor,
  ): Promise<PaginatedEntity<Account>>;
  getSession(accountId: BufferId): Promise<Session>;
  getLoginManager(loginKeyStore?: LoginKeyStore): LoginManager;
  onKeyStoreChanged(callback: (newKeyStore: KeyStoreInteractor) => void): void;
};
