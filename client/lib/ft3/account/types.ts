import { SignatureProvider } from "postchain-client/built/src/gtx/interfaces";
import { Balance } from "../asset/types";
import { AssetAmount } from "../asset/types";
import { AuthDescriptor } from "./auth-descriptor/types";
import { GtvCompatible } from "../utils/gtv";
import { BufferId } from "../../cryptoUtils";

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
  authDescriptor: AuthDescriptor;
};

// TODO: Rename to Account after deleting Account type
export interface IAccount {
  id: BufferId;
  // TODO: Use Page<Balance> type instead
  getBalances: () => Promise<Balance[]>;
  isAuthDescriptorValid: (authDescriptorId) => Promise<boolean>;
  getRateLimit: () => Promise<RateLimit>;
  getBalanceByAssetId: (assetId: BufferId) => Promise<Balance>;
}
