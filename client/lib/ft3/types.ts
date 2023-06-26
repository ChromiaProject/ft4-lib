import { GtxClient } from "postchain-client/built/src/gtx/interfaces";
import { BufferId } from "../cryptoUtils";
import { AuthDescriptor } from "./account/auth-descriptor/types";
import {
  PaymentHistoryIterator,
  PaymentHistoryStore,
} from "./account/payment-history/interfaces";
import { Amount } from "./asset/interfaces";
import {
  Account,
  RateLimit,
  User,
  IAccount,
  IAuthenticatedAccount,
} from "./account/types";
import { Asset, Balance } from "./asset/types";
import { QueryObject, Operation, Config, PaginatedEntity } from "./utils/types";
import { TransactionBuilder } from "./utils/transaction-builder";

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
    sso: {
      ssoRegister: (authDescriptor: AuthDescriptor) => Promise<Buffer>;
      ssoAddAuthDescriptor: (
        accountid: BufferId,
        authDescriptor: AuthDescriptor
      ) => Promise<Buffer>;
    };
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
      xcTransfer: () => Promise<void>;
    };
    admin: {
      register: (
        adminUser: User,
        authDescriptor: AuthDescriptor
      ) => Promise<Account>;
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
      participantId: (id: BufferId) => Promise<Account[]>;
      authDescriptorId: (id: BufferId) => Promise<Account[]>;
      ids: (ids: Buffer[]) => Promise<Account[]>;
      id: (id: BufferId) => Promise<Account | null>;
    };
    paymentHistory: {
      iterator: (
        paymentHistoryStore: PaymentHistoryStore
      ) => PaymentHistoryIterator;
      storeMemory: (
        accountId: BufferId,
        pageSize: number
      ) => Promise<PaymentHistoryStore>;
      storeLocal: (
        accountId: BufferId,
        pageSize: number
      ) => Promise<PaymentHistoryStore>;
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
  client: GtxClient;
  query: <T>(query: QueryObject) => Promise<T | null>;
  getConfig: () => Promise<Config>;
  getVersion: () => Promise<string>;

  getAccountById: (accountId: BufferId) => Promise<IAccount | null>;
  getAccountsByParticipantId: (participantId: BufferId) => Promise<IAccount[]>;
  getAccountsByAuthDescriptorId: (
    authDescriptorId: BufferId
  ) => Promise<IAccount[]>;

  getAssetById: (assetId: BufferId) => Promise<Asset | null>;
  getAssetsByName: (name: string) => Promise<Asset[]>;
  getAllAssets: () => Promise<Asset[]>;
  getAllAssetsPaginated: (
    limit?: number,
    cursor?: OptionalPageCursor
  ) => Promise<PaginatedEntity<Asset>>;
}

export interface Session extends Connection {
  account: IAuthenticatedAccount;
  call: (...operations: Operation[]) => Promise<void>;
  callWithoutNop: (...operations: Operation[]) => Promise<void>;
  transactionBuilder: () => TransactionBuilder;
}
