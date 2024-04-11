import { BufferId, Config, PaginatedEntity } from "@ft4/utils";
import { Buffer } from "buffer";
import {
  TransactionBuilder,
  TransactionBuilderConfig,
} from "@ft4/transaction-builder";
import {
  GTX,
  IClient,
  Operation,
  Queryable,
  RawGtx,
  SignedTransaction,
  TransactionReceipt,
 Web3PromiEvent } from "postchain-client";
import {
  Account,
  AuthDescriptorValidator,
  AuthenticatedAccount,
  TransferDetail,
} from "@ft4/accounts";
import { Asset } from "@ft4/asset";
import { LoginOptions, SessionWithLogout } from "@ft4/authentication";
import { TransactionWithReceipt } from "@ft4/transaction-builder/types";

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
  getAssetsByType: (
    type: string,
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
  call: (...operations: Operation[]) => Web3PromiEvent<
    TransactionWithReceipt,
    {
      built: SignedTransaction;
      sent: Buffer;
    }
  >;
  callWithoutNop: (...operations: Operation[]) => Web3PromiEvent<
    TransactionWithReceipt,
    {
      built: SignedTransaction;
      sent: Buffer;
    }
  >;
  transactionBuilder: (
    config?: TransactionBuilderConfig | undefined,
  ) => TransactionBuilder;
  sign: (tx: GTX | RawGtx | SignedTransaction) => Promise<SignedTransaction>;
  signAndSend: (
    tx: GTX | RawGtx | SignedTransaction,
  ) => Promise<TransactionReceipt>;
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
