import { SignatureProvider, KeyPair } from "postchain-client";
import { Balance } from "../asset/types";
import { AuthDescriptor } from "./auth-descriptor/types";
import { BufferId } from "../cryptoUtils";
import {
  TransferHistoryFilter,
  TransferHistoryResponse,
  TransferHistoryEntry,
} from "./transfer-history/types";
import { Authenticator } from "../authentication/types";
import { Amount } from "../asset/interfaces";
import { OptionalPageCursor } from "../types";
import {
  PaginatedEntity,
  TransactionCompletion,
  TransactionSessionCompletion,
} from "../utils/types";
import { Buffer } from "buffer";
import { PendingTransfer } from "../crosschain/types";

export type RateLimit = {
  points: number;
  lastUpdate: number;
  getAvailablePoints: () => number | null;
};

export interface Account {
  id: Buffer;
  getBalances: (
    limit?: number,
    cursor?: OptionalPageCursor,
  ) => Promise<PaginatedEntity<Balance>>;
  getBalanceByAssetId: (assetId: BufferId) => Promise<Balance>;
  isAuthDescriptorValid: (authDescriptorId: BufferId) => Promise<boolean>;
  getAuthDescriptors: (
    limit?: number,
    cursor?: OptionalPageCursor,
  ) => Promise<PaginatedEntity<AuthDescriptor>>;
  getAuthDescriptorsByParticipantId: (
    partiticipantId: BufferId,
  ) => Promise<PaginatedEntity<AuthDescriptor>>;
  getRateLimit: () => Promise<RateLimit>;
  getTransferHistory: (
    limit?: number,
    filter?: TransferHistoryFilter,
    cursor?: OptionalPageCursor,
  ) => Promise<TransferHistoryResponse>;
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
    authDescriptor: AuthDescriptor,
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
