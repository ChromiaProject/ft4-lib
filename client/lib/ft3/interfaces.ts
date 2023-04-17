import { GtxClient } from "postchain-client/built/src/gtx/interfaces";
import { BufferId } from "../cryptoUtils";
import { AuthDescriptor } from "./account/auth-descriptor/types";
import {
  PaymentHistoryIterator,
  PaymentHistoryStore,
} from "./account/payment-history/interfaces";
import { Account, RateLimit, User } from "./account/types";
import { Asset, AssetAmount, Balance } from "./asset/types";
import { ChainInfo } from "./utils/types";

export interface ftUserSession {
  user: User;
  changeUser: (newUser: User) => ftUserSession;
  get: ftQuerySession;
  asset: {
    dev: {
      register: (name: string, brid: BufferId) => Promise<Buffer>;
    };
  };
  balance: {
    dev: {
      give: (
        assetid: BufferId,
        accountid: BufferId,
        amount: AssetAmount
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
        amount: bigint
      ) => Promise<void>;
      burn: (from: BufferId, asset: BufferId, amount: bigint) => Promise<void>;
      xcTransfer: () => Promise<void>;
    };
    dev: {
      register: (authDescriptor: AuthDescriptor) => Promise<Account>;
      freeOperation: (accountid: BufferId) => Promise<void>;
      givePoints: (accountId: BufferId, points: number) => Promise<void>;
    };
  };
}

export interface ftQuerySession {
  gtxClient: GtxClient;
  createUserSession: (user: User) => ftUserSession;
  chainInfo: () => Promise<ChainInfo>;
  version: () => Promise<string>;
  lastTimestamp: () => Promise<number>;
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
      id: (id: BufferId) => Promise<Account>;
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
