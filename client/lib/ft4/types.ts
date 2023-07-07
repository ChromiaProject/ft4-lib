import { BufferId } from "../cryptoUtils";
import { AuthDescriptor } from "./accounts/auth-descriptor/types";
import { Amount } from "./asset/interfaces";
import {
  LegacyAccount,
  RateLimit,
  User,
  Account,
  AuthenticatedAccount,
} from "./accounts/types";
import { Asset, Balance } from "./asset/types";
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
  asset: {
    admin: {
      register: (
        adminUser: User,
        name: string,
        symbol: string,
        decimals: number,
        iconUrl: string
      ) => Promise<Buffer>;
    };
  };
  balance: {
    admin: {
      mint: (
        adminUser: User,
        assetid: BufferId,
        accountid: BufferId,
        amount: Amount
      ) => Promise<void>;
    };
  };

  account: {
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
      ) => Promise<LegacyAccount>;
      givePoints: (
        adminUser: User,
        accountId: BufferId,
        points: number
      ) => Promise<void>;
    };
  };
}

export interface ftQuerySession {
  gtxClient: GtxClient;
  createUserSession: (user: User) => ftUserSession;
  asset: {
    id: (name: string, brid: BufferId) => Buffer;
    by: {
      name: (name: string) => Promise<Asset[]>;
      id: (assetId: BufferId) => Promise<Asset>;
    };
    all: () => Promise<Asset[]>;
  };
  balance: {
    by: {
      accountId: (accountid: BufferId) => Promise<Balance[]>;
      accountAndAssetId: (
        accountid: BufferId,
        assetid: BufferId
      ) => Promise<Balance>;
    };
  };
  account: {
    by: {
      participantId: (id: BufferId) => Promise<LegacyAccount[]>;
      authDescriptorId: (id: BufferId) => Promise<LegacyAccount[]>;
      ids: (ids: Buffer[]) => Promise<LegacyAccount[]>;
      id: (id: BufferId) => Promise<LegacyAccount | null>;
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

  getAccountById: (accountId: BufferId) => Promise<Account | null>;
  getAccountsByParticipantId: (participantId: BufferId) => Promise<Account[]>;
  getAccountsByAuthDescriptorId: (
    id: BufferId,
    limit?: number,
    cursor?: OptionalPageCursor
  ) => Promise<PaginatedEntity<Account>>;

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
  account: AuthenticatedAccount;
  call: (...operations: Operation[]) => Promise<TransactionReceipt>;
  callWithoutNop: (...operations: Operation[]) => Promise<TransactionReceipt>;
  transactionBuilder: () => TransactionBuilder;
}
