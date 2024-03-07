import { Account, AuthenticatedAccount } from "./accounts";
import { Asset } from "./asset";
import { Buffer } from "buffer";
import { BufferId, PaginatedEntity } from "@ft4/utils";
import { Config } from "@ft4/utils/types";
import { TransactionBuilder } from "@ft4/utils/transaction-builder";
import {
  IClient,
  Queryable,
  Operation,
  TransactionReceipt,
} from "postchain-client";
import { TransferDetail, AuthDescriptorValidator } from "./accounts";
import { LoginOptions, SessionWithLogout } from "./authentication/login";

export type PageCursor = string;
export type OptionalPageCursor = PageCursor | null;
export type OptionalLimit = number | null;
export type PagedResponse<T> = {
  data: T[];
  next_cursor: OptionalPageCursor;
};

export interface Connection extends Queryable {
  client: IClient;
  blockchainRid: Buffer;

  getConfig: () => Promise<Config>;
  getVersion: () => Promise<string>;

  getBlockHeight: () => Promise<number>;

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
  getAuthDescriptorValidator: (useCache: boolean) => AuthDescriptorValidator;

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
  login: (loginOptions: LoginOptions) => Promise<SessionWithLogout>;
  onKeyStoreChanged(
    callback: (newKeyStore: KeyStoreInteractor | null) => void,
  ): void;
};

export type AuthHandler = {
  name: string;
  flags: string[];
  dynamic: boolean;
};
