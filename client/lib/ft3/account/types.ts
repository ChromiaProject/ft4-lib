import { SignatureProvider } from "postchain-client/built/src/gtx/interfaces";
import { Balance } from "../asset/types";
import { AssetAmount } from "../asset/types";
import { AuthDescriptor } from "./auth-descriptor/types";

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
  amount: AssetAmount
];

export type XferOutput = [
  accountId: Buffer,
  assetId: Buffer,
  amount: AssetAmount
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
