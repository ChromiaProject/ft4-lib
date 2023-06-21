import { SignatureProvider } from "postchain-client/built/src/gtx/interfaces";
import { Balance } from "../asset/types";
import { AuthDescriptor } from "./auth-descriptor/types";
import { BufferId, KeyPair } from "../../cryptoUtils";
import { KeyManager } from "./auth/types";
import {
  PaymentHistoryFilter,
  TransferHistoryResponse,
  PaymentHistoryEntry,
} from "./payment-history/types";
import { Authenticator } from "../authentication/interfaces";
import { Amount } from "../asset/interfaces";
import { RawGtv } from "postchain-client/built/src/gtv/types";
import { OptionalPageCursor } from "../types";
import { PaginatedEntity } from "../utils/types";

export type Account = {
  id: Buffer;
  balances: Balance[];
  authDescriptors: AuthDescriptor[];
  //rateLimit: RateLimit;
};

export type XferInput = [
  accountId: Buffer,
  assetId: Buffer,
  authDescriptorId: Buffer,
  amount: bigint,
  extra: { [key: string]: RawGtv }
];

export type XferOutput = [
  accountId: Buffer,
  assetId: Buffer,
  amount: bigint,
  extra: { [key: string]: RawGtv }
];

export type RateLimit = {
  points: number;
  lastUpdate: number;
  getAvailablePoints: () => number | null;
};

export type User = {
  signatureProvider: SignatureProvider;
  keyManagers: KeyManager[];
  authDescriptor: AuthDescriptor;
};

// TODO: Rename to Account after deleting Account type
export interface IAccount {
  id: BufferId;
  getBalances: () => Promise<Balance[]>;
  getBalancesPaginated: (
    limit?: number,
    cursor?: OptionalPageCursor
  ) => Promise<PaginatedEntity<Balance[]>>;
  getBalanceByAssetId: (assetId: BufferId) => Promise<Balance>;
  isAuthDescriptorValid: (authDescriptorId: BufferId) => Promise<boolean>;
  getAuthDescriptors: () => Promise<AuthDescriptor[]>;
  getAuthDescriptorsPaginated: (
    limit?: number,
    cursor?: OptionalPageCursor
  ) => Promise<PaginatedEntity<AuthDescriptor[]>>;
  getAuthDescriptorsByParticipantId: (
    partiticipantId: BufferId
  ) => Promise<AuthDescriptor[]>;
  getRateLimit: () => Promise<RateLimit>;
  getTransferHistory: (
    limit?: number,
    filter?: PaymentHistoryFilter,
    cursor?: OptionalPageCursor
  ) => Promise<TransferHistoryResponse>;
  getTransferHistoryEntry: (
    rowid: number
  ) => Promise<PaymentHistoryEntry | null>;
}

export interface IAuthenticatedAccount extends IAccount {
  authenticator: Authenticator;
  addAuthDescriptor: (
    authDescriptor: AuthDescriptor,
    keyPair: KeyPair
  ) => Promise<void>;
  deleteAuthDescriptor: (authDescriptorId: BufferId) => Promise<void>;
  transfer: (
    receiverId: BufferId,
    assetId: BufferId,
    amount: Amount
  ) => Promise<void>;
  xcTransfer: (
    brid: BufferId,
    receiverId: BufferId,
    assetId: BufferId,
    amount: Amount
  ) => Promise<void>;
  burn: (assetId: BufferId, amount: Amount) => Promise<void>;
}
