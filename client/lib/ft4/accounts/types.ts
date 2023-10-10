import { Buffer } from "buffer";
import { KeyPair, SignatureProvider } from "postchain-client";
import { BufferId } from "../../cryptoUtils";
import { Amount } from "../asset/interfaces";
import { Balance } from "../asset/types";
import { Authenticator } from "../authentication/types";
import { OptionalPageCursor } from "../types";
import {
  PaginatedEntity,
  TransactionCompletion,
  TransactionSessionCompletion,
} from "../utils/types";
import {
  TransferHistoryEntry,
  TransferHistoryFilter,
  TransferHistoryResponse,
} from "./transfer-history/types";
import {
  AnyAuthDescriptor,
  AnyAuthDescriptorRegistration,
} from "/ft4/accounts/auth-descriptor/types";

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
  ) => Promise<PaginatedEntity<AnyAuthDescriptor>>;
  getAuthDescriptorsByParticipantId: (
    partiticipantId: BufferId,
  ) => Promise<AnyAuthDescriptor[]>;
  getRateLimit: () => Promise<RateLimit>;
  getTransferHistory: (
    limit?: number,
    filter?: TransferHistoryFilter,
    cursor?: OptionalPageCursor,
  ) => Promise<TransferHistoryResponse>;
  getTransferHistoryEntry: (
    rowid: number,
  ) => Promise<TransferHistoryEntry | null>;
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
