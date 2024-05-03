import { Amount, Balance } from "@ft4/asset";
import { Authenticator, KeyStore } from "@ft4/authentication";
import { OptionalPageCursor } from "@ft4/ft-session";
import {
  BufferId,
  PaginatedEntity,
  TransactionSessionCompletion,
} from "@ft4/utils";
import { Buffer } from "buffer";
import {
  TransferHistoryEntry,
  TransferHistoryFilter,
} from "./transfer-history";
import {
  AnyAuthDescriptor,
  AuthDescriptorRegistration,
  SingleSig,
} from "@ft4/accounts";
import { PendingTransfer, TransferRef } from "@ft4/crosschain";
import {
  SignedTransaction,
  TransactionReceipt,
  Web3PromiEvent,
} from "postchain-client";
import { TransactionWithReceipt } from "@ft4/transaction-builder/index";

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
  getMainAuthDescriptor: () => Promise<AnyAuthDescriptor>;
  getAuthDescriptors: () => Promise<AnyAuthDescriptor[]>;
  getAuthDescriptorById: (
    authDescriptorId: BufferId,
  ) => Promise<AnyAuthDescriptor>;
  getAuthDescriptorsBySigner: (
    signer: BufferId,
  ) => Promise<AnyAuthDescriptor[]>;
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
  getLastPendingCrosschainTransfer: (
    targetBlockchainRid: BufferId,
    recipientId: BufferId,
    assetId: BufferId,
    amount: bigint,
  ) => Promise<PendingTransfer | null>;
}

export interface AuthenticatedAccount extends Account {
  authenticator: Authenticator;
  addAuthDescriptor: (
    authDescriptor: AuthDescriptorRegistration<SingleSig>,
    keyStore: KeyStore,
  ) => Web3PromiEvent<
    TransactionSessionCompletion,
    {
      built: SignedTransaction;
      sent: Buffer;
    }
  >;
  updateMainAuthDescriptor: (
    authDescroptor: AuthDescriptorRegistration<SingleSig>,
    keyStore: KeyStore,
  ) => Web3PromiEvent<
    TransactionSessionCompletion,
    {
      built: SignedTransaction;
      sent: Buffer;
    }
  >;
  deleteAuthDescriptor: (authDescriptorId: BufferId) => Web3PromiEvent<
    TransactionSessionCompletion,
    {
      built: SignedTransaction;
      sent: Buffer;
    }
  >;
  deleteAllAuthDescriptorsExceptMain: () => Web3PromiEvent<
    TransactionSessionCompletion,
    {
      built: SignedTransaction;
      sent: Buffer;
    }
  >;
  transfer: (
    receiverId: BufferId,
    assetId: BufferId,
    amount: Amount,
  ) => Web3PromiEvent<
    TransactionWithReceipt,
    {
      built: SignedTransaction;
      sent: Buffer;
    }
  >;
  recallUnclaimedTransfer: (
    txRid: BufferId,
    opIndex: number,
  ) => Web3PromiEvent<
    TransactionWithReceipt,
    {
      built: SignedTransaction;
      sent: Buffer;
    }
  >;

  /**
   * Perform a cross-chain transfer.
   *
   * @param targetChainRid - RID of the target blockchain.
   * @param recipientId - ID of the recipient.
   * @param assetId - ID of the asset to be transferred.
   * @param amount - The amount to be transferred.
   *
   * Will emit events when the `init_transfer` transaction is built,
   * when `init_transfer` transaction is anchored,
   * and on each hop (containing blockchain RID).
   *
   * Will resolve when `complete_transfer` transaction is confirmed.
   */
  crosschainTransfer: (
    targetChainId: BufferId,
    recipientId: BufferId,
    assetId: BufferId,
    amount: Amount,
  ) => Web3PromiEvent<
    TransferRef,
    {
      built: SignedTransaction;
      init: TransactionReceipt;
      hop: Buffer;
    }
  >;

  /**
   * Resume a cross-chain transfer which was initiated but did not complete properly.
   *
   * @param pendingTransfer - The transfer to resume
   *
   * Will emit event on each hop (containing blockchain RID).
   *
   * Will resolve when `complete_transfer` transaction is confirmed.
   */
  resumeCrosschainTransfer: (pendingTransfer: TransferRef) => Web3PromiEvent<
    void,
    {
      hop: Buffer;
    }
  >;

  /**
   * Revert a cross-chain transfer which was initiated but did not complete properly.
   *
   * @param pendingTransfer - The transfer to revert
   *
   * Will emit event on each hop (containing blockchain RID).
   *
   * Will resolve when `revert_transfer` transaction is confirmed.
   */
  revertCrosschainTransfer: (pendingTransfer: TransferRef) => Web3PromiEvent<
    void,
    {
      hop: Buffer;
    }
  >;

  /**
   * Recalls a cross-chain account creation transfer which was not claimed
   * before timeout.
   *
   * @param pendingTransfer - The transfer to recall
   *
   * Will emit event on each hop (containing blockchain RID).
   *
   * Will resolve when `revert_transfer` transaction is confirmed.
   */
  recallUnclaimedCrosschainTransfer: (
    pendingTransfer: TransferRef,
  ) => Web3PromiEvent<
    void,
    {
      hop: Buffer;
    }
  >;

  burn: (
    assetId: BufferId,
    amount: Amount,
  ) => Web3PromiEvent<
    TransactionWithReceipt,
    {
      built: SignedTransaction;
      sent: Buffer;
    }
  >;
}
