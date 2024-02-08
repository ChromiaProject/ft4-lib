import { Buffer } from "buffer";
import { KeyPair, SignatureProvider } from "postchain-client";
import { Amount, Balance } from "@ft4/asset";
import { Authenticator } from "@ft4/authentication";
import { OptionalPageCursor } from "@ft4/index";
import { BufferId, PaginatedEntity } from "@ft4/utils";
import {
  TransactionCompletion,
  TransactionSessionCompletion,
} from "@ft4/utils/types";
import {
  TransferHistoryEntry,
  TransferHistoryFilter,
} from "./transfer-history";
import {
  AnyAuthDescriptor,
  AnyAuthDescriptorRegistration,
} from "@ft4/accounts/auth-descriptor";
import { PendingTransfer } from "@ft4/crosschain";

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
    limit?: number,
    cursor?: OptionalPageCursor,
  ) => Promise<PaginatedEntity<AnyAuthDescriptor>>;
  getAuthDescriptorsBySigner: (
    signer: BufferId,
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
