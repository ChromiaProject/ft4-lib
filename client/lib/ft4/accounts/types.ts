import { Buffer } from "buffer";
import { KeyPair, SignatureProvider } from "postchain-client";
import { Amount } from "../asset/interfaces";
import { Balance } from "../asset/types";
import { Authenticator } from "../authentication/types";
import { OptionalPageCursor } from "../types";
import {
  BufferId,
  PaginatedEntity,
  TransactionCompletion,
  TransactionSessionCompletion,
} from "@ft4/utils/types";
import {
  TransferHistoryEntry,
  TransferHistoryFilter,
} from "./transfer-history/types";
import {
  AnyAuthDescriptor,
  AnyAuthDescriptorRegistration,
} from "@ft4/accounts/auth-descriptor/types";
import { PendingTransfer } from "../crosschain/types";

export type RateLimit = {
  points: number;
  lastUpdate: Date;
  getAvailablePoints: () => number | null;
};

export type RateLimitResponse = {
  points: number;
  lastUpdate: number;
};

export interface Account {
  id: Buffer;
  blockchainRid: Buffer;
  getBalances: (
    limit?: number,
    cursor?: OptionalPageCursor,
  ) => Promise<PaginatedEntity<Balance>>;
  getBalanceByAssetId: (assetId: BufferId) => Promise<Balance | null>;
  isAuthDescriptorValid: (authDescriptorId: BufferId) => Promise<boolean>;
  getAuthDescriptors: (
    includeInactive?: boolean,
    limit?: number,
    cursor?: OptionalPageCursor,
  ) => Promise<PaginatedEntity<AnyAuthDescriptor>>;
  getAuthDescriptorsBySigner: (
    signer: BufferId,
    includeInactive?: boolean,
    limit?: number,
    cursor?: OptionalPageCursor,
  ) => Promise<PaginatedEntity<AnyAuthDescriptor>>;
  getRateLimit: () => Promise<RateLimit>;
  getTransferHistory: (
    limit?: number,
    filter?: TransferHistoryFilter,
    cursor?: OptionalPageCursor,
  ) => Promise<PaginatedEntity<TransferHistoryEntry>>;
  getTransferHistoryEntry: (
    rowid: number,
  ) => Promise<TransferHistoryEntry | null>;
  getPendingCrosschainTransfers: () => Promise<
    PaginatedEntity<PendingTransfer>
  >;
}

export interface AuthenticatedAccount extends Account {
  authenticator: Authenticator;
  addAuthDescriptor: (
    authDescriptor: AnyAuthDescriptorRegistration,
    newSigner: SignatureProvider | KeyPair,
  ) => Promise<TransactionSessionCompletion>;
  deleteAuthDescriptor: (
    authDescriptorId: BufferId,
  ) => Promise<TransactionSessionCompletion>;
  transfer: (
    receiverId: BufferId,
    assetId: BufferId,
    amount: Amount,
  ) => Promise<TransactionCompletion>;
  burn: (assetId: BufferId, amount: Amount) => Promise<TransactionCompletion>;
}
