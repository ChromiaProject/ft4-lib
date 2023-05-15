import { SignatureProvider } from "postchain-client/built/src/gtx/interfaces";
import { Balance, AssetAmount } from "../asset/types";
import { AuthDescriptor, GtvAuthDescriptor } from "./auth-descriptor/types";
import { GtvCompatible } from "../utils/gtv";
import { BufferId, KeyPair } from "../../cryptoUtils";
import { KeyManager } from "./auth/types";
import {
  PaymentHistoryCursor,
  PaymentHistoryEntry,
  PaymentHistoryFilter,
} from "./payment-history/types";
import { Authenticator } from "../authentication/interfaces";

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
  amount: AssetAmount,
  extra: { [key: string]: GtvCompatible }
];

export type XferOutput = [
  accountId: Buffer,
  assetId: Buffer,
  amount: AssetAmount,
  extra: { [key: string]: GtvCompatible }
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
  // TODO: Use Page<Balance> type instead
  getBalances: () => Promise<Balance[]>;
  getBalanceByAssetId: (assetId: BufferId) => Promise<Balance>;
  isAuthDescriptorValid: (authDescriptorId: BufferId) => Promise<boolean>;
  getAuthDescriptors: () => Promise<GtvAuthDescriptor[]>;
  getAuthDescriptorsByParticipantId: (
    partiticipantId: BufferId
  ) => Promise<AuthDescriptor[]>;
  getRateLimit: () => Promise<RateLimit>;
  getTransferHistory: (
    limit?: number,
    filter?: PaymentHistoryFilter,
    cursor?: PaymentHistoryCursor | null
  ) => Promise<PaymentHistoryEntry[]>;
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
    amount: AssetAmount
  ) => Promise<void>;
  xcTransfer: (
    brid: BufferId,
    receiverId: BufferId,
    assetId: BufferId,
    amount: AssetAmount
  ) => Promise<void>;
  burn: (assetId: BufferId, amount: AssetAmount) => Promise<void>;
}
