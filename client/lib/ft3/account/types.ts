import { SignatureProvider } from "postchain-client/built/src/gtx/interfaces";
import { Balance, AssetAmount } from "../asset/types";
import { AuthDescriptor } from "./auth-descriptor/types";
import { GtvCompatible } from "../utils/gtv";
import { KeyManager } from "./auth/types";

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
