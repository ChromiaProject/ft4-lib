import { BufferId } from "../cryptoUtils";
import { Account, AuthenticatedAccount } from "./accounts/types";
import { Asset } from "./asset/types";
import { Config, PaginatedEntity, TransactionCompletion } from "./utils/types";
import { TransactionBuilder } from "./utils/transaction-builder";
import {
  IClient,
  QueryArguments,
  QueryObject,
  Operation,
} from "postchain-client";

export type PageCursor = string;
export type OptionalPageCursor = PageCursor | null;
export type PagedResponse<T> = {
  data: T[];
  next_cursor: OptionalPageCursor;
};

export interface Connection {
  client: IClient;
  query: <T>(query: QueryObject<QueryArguments>) => Promise<T | null>;
  getConfig: () => Promise<Config>;
  getVersion: () => Promise<string>;

  getAccountById: (accountId: BufferId) => Promise<Account | null>;
  getAccountsByParticipantId: (participantId: BufferId) => Promise<Account[]>;
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
  call: (...operations: Operation[]) => Promise<TransactionCompletion>;
  callWithoutNop: (
    ...operations: Operation[]
  ) => Promise<TransactionCompletion>;
  transactionBuilder: () => TransactionBuilder;
}
