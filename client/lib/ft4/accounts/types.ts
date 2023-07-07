import {
  SignatureProvider,
  RawGtv,
  TransactionReceipt,
} from "postchain-client";
import { Balance } from "../asset/types";
import { AuthDescriptor } from "./auth-descriptor/types";
import { BufferId, KeyPair } from "../../cryptoUtils";
import { KeyManager } from "./auth/types";
import {
  TransferHistoryFilter,
  TransferHistoryResponse,
  TransferHistoryEntry,
} from "./transfer-history/types";
import { Authenticator } from "../authentication/types";
import { Amount } from "../asset/interfaces";
import { OptionalPageCursor } from "../types";
import { PaginatedEntity } from "../utils/types";
import { Buffer } from "buffer";

/**
 * @deprecated use `Account` instead
 */
export type LegacyAccount = {
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

export interface Account {
  id: Buffer;
  getBalances: (
    limit?: number,
    cursor?: OptionalPageCursor
  ) => Promise<PaginatedEntity<Balance>>;
  getBalanceByAssetId: (assetId: BufferId) => Promise<Balance>;
  isAuthDescriptorValid: (authDescriptorId: BufferId) => Promise<boolean>;
  getAuthDescriptors: (
    limit?: number,
    cursor?: OptionalPageCursor
  ) => Promise<PaginatedEntity<AuthDescriptor>>;
  getAuthDescriptorsByParticipantId: (
    partiticipantId: BufferId
  ) => Promise<AuthDescriptor[]>;
  getRateLimit: () => Promise<RateLimit>;
  getTransferHistory: (
    limit?: number,
    filter?: TransferHistoryFilter,
    cursor?: OptionalPageCursor
  ) => Promise<TransferHistoryResponse>;
  getTransferHistoryEntry: (
    rowid: number
  ) => Promise<TransferHistoryEntry | null>;
}

export interface AuthenticatedAccount extends Account {
  authenticator: Authenticator;
  addAuthDescriptor: (
    authDescriptor: AuthDescriptor,
    keyPair: KeyPair
  ) => Promise<TransactionReceipt>;
  deleteAuthDescriptor: (
    authDescriptorId: BufferId
  ) => Promise<TransactionReceipt>;
  transfer: (
    receiverId: BufferId,
    assetId: BufferId,
    amount: Amount
  ) => Promise<TransactionReceipt>;
  burn: (assetId: BufferId, amount: Amount) => Promise<TransactionReceipt>;
}
