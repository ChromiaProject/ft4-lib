import { BufferId } from "../cryptoUtils";
import { AuthDescriptor } from "./accounts/auth-descriptor/types";
import { Amount } from "./asset/interfaces";
import {
  Account,
  RateLimit,
  User,
  IAccount,
  IAuthenticatedAccount,
} from "./accounts/types";
import { Asset } from "./asset/types";
import { Config, PaginatedEntity } from "./utils/types";
import { TransactionBuilder } from "./utils/transaction-builder";
import { Buffer } from "buffer";
import {
  IClient,
  QueryArguments,
  QueryObject,
  GtxClient,
  Operation,
  TransactionReceipt,
} from "postchain-client";

export type PageCursor = string;
export type OptionalPageCursor = PageCursor | null;
export type PagedResponse<T> = {
  data: T[];
  next_cursor: OptionalPageCursor;
};
export interface ftUserSession {
  user: User;
  changeUser: (newUser: User) => ftUserSession;
  get: ftQuerySession;

  account: {
    authDescriptor: {
      add: (newUser: User, accountId: BufferId) => Promise<void>;
      deleteAllExcluding: (
        authDescriptorid: BufferId,
        accountid: BufferId
      ) => Promise<void>;
      delete: (
        authDescriptorid: BufferId,
        accountid: BufferId
      ) => Promise<void>;
    };
    token: {
      transfer: (
        from: BufferId,
        to: BufferId,
        asset: BufferId,
        amount: Amount
      ) => Promise<void>;
      burn: (from: BufferId, asset: BufferId, amount: Amount) => Promise<void>;
    };
    admin: {
      register: (
        adminUser: User,
        authDescriptor: AuthDescriptor
      ) => Promise<Account>;
    };
  };
}

export interface ftQuerySession {
  gtxClient: GtxClient;
  createUserSession: (user: User) => ftUserSession;
  account: {
    by: {
      authDescriptorId: (id: BufferId) => Promise<Account[]>;
      ids: (ids: Buffer[]) => Promise<Account[]>;
      id: (id: BufferId) => Promise<Account | null>;
    };
    isAuthDescriptorValid: (
      accountid: BufferId,
      authDescriptorid: BufferId
    ) => Promise<boolean>;
    rateLimit: (accountId: BufferId) => Promise<RateLimit>;
    idFromAuthDescriptor: (firstAuthDescriptor: AuthDescriptor) => Buffer;
  };
}

export interface Connection {
  client: IClient;
  query: <T>(query: QueryObject<QueryArguments>) => Promise<T | null>;
  getConfig: () => Promise<Config>;
  getVersion: () => Promise<string>;

  getAccountById: (accountId: BufferId) => Promise<IAccount | null>;
  getAccountsByParticipantId: (participantId: BufferId) => Promise<IAccount[]>;
  getAccountsByAuthDescriptorId: (
    id: BufferId,
    limit?: number,
    cursor?: OptionalPageCursor
  ) => Promise<PaginatedEntity<IAccount>>;

  getAssetById: (assetId: BufferId) => Promise<Asset | null>;
  getAssetBySymbol: (symbol: string) => Promise<Asset | null>;
  getAssetsByName: (
    name: string,
    limit?: number,
    cursor?: OptionalPageCursor
  ) => Promise<PaginatedEntity<Asset>>;
  getAllAssets: (
    limit?: number,
    cursor?: OptionalPageCursor
  ) => Promise<PaginatedEntity<Asset>>;
}

export interface Session extends Connection {
  account: IAuthenticatedAccount;
  call: (...operations: Operation[]) => Promise<TransactionReceipt>;
  callWithoutNop: (...operations: Operation[]) => Promise<TransactionReceipt>;
  transactionBuilder: () => TransactionBuilder;
}
