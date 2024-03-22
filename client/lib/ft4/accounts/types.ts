import { Buffer } from "buffer";
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
import { FtKeyStore } from "@ft4/authentication";
import { PendingTransfer } from "@ft4/crosschain";
import { Web3PromiEvent } from "postchain-client";
import { SignedTransaction } from "postchain-client";
import { TransactionReceipt } from "postchain-client";

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
  getAuthDescriptors: () => Promise<AnyAuthDescriptor[]>;
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
    authDescriptor: AnyAuthDescriptorRegistration,
    keyStore: FtKeyStore,
  ) => Promise<TransactionSessionCompletion>;
  deleteAuthDescriptor: (
    authDescriptorId: BufferId,
  ) => Promise<TransactionSessionCompletion>;
  transfer: (
    receiverId: BufferId,
    assetId: BufferId,
    amount: Amount,
  ) => Promise<TransactionCompletion>;

  /**
   * Perform a cross-chain transfer.
   *
   * @param {BufferId} targetChainRid - RID of the target blockchain.
   * @param {BufferId} recipientId - ID of the recipient.
   * @param {BufferId} assetId - ID of the asset to be transferred.
   * @param {Amount} amount - The amount to be transferred.
   *
   * Will emit events when the `init_transfer` transaction is signed,
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
    void,
    {
      signed: SignedTransaction;
      init: TransactionReceipt;
      hop: Buffer;
    }
  >;

  /**
   * Resume a cross-chain transfer which was initiated but did not complete properly.
   *
   * @param {PendingTransfer} pendingTransfer - The transfer to resume
   *
   * Will emit event on each hop (containing blockchain RID).
   *
   * Will resolve when `complete_transfer` transaction is confirmed.
   */
  resumeCrosschainTransfer: (
    pendingTransfer: PendingTransfer,
  ) => Web3PromiEvent<
    void,
    {
      hop: Buffer;
    }
  >;

  burn: (assetId: BufferId, amount: Amount) => Promise<TransactionCompletion>;
}
