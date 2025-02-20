import { Buffer } from "buffer";
import { AuthDescriptorRules, RawRules } from "./rules";

export const AuthFlag = Object.freeze({
  Account: "A", // Change Account settings
  Transfer: "T", // Transfer balance
});

export enum AuthType {
  SingleSig = "S",
  MultiSig = "M",
}

export type AuthDescriptor<T extends SingleSig | MultiSig> = {
  id: Buffer;
  accountId: Buffer;
  accountType: string;
  authType: AuthType;
  rules: AuthDescriptorRules | null;
  created: Date;
  args: T;
};

export type AuthDescriptorRegistration<T extends SingleSig | MultiSig> = {
  authType: AuthType;
  args: T;
  rules: AuthDescriptorRules | null;
};

export type AnyAuthDescriptor =
  | AuthDescriptor<SingleSig>
  | AuthDescriptor<MultiSig>;

export type AnyAuthDescriptorRegistration =
  | AuthDescriptorRegistration<SingleSig>
  | AuthDescriptorRegistration<MultiSig>;

export type SingleSig = {
  flags: string[];
  signer: Buffer;
};

export type MultiSig = {
  flags: string[];
  signaturesRequired: number;
  signers: Buffer[];
};

// ======== Server side =======================
export type RawMultiSig = readonly [
  flags: string[],
  signaturesRequired: number,
  signers: Buffer[],
];

export type RawSingleSig = readonly [flags: string[], signer: Buffer];

// ======== Server side request model =========

export type RawAuthDescriptorArgs = RawSingleSig | RawMultiSig;
export type RawAuthDescriptorRegistration<T extends RawAuthDescriptorArgs> =
  readonly [auth_type: number, args: T, rules: RawRules | null];

export type RawAnyAuthDescriptorRegistration =
  | RawAuthDescriptorRegistration<RawSingleSig>
  | RawAuthDescriptorRegistration<RawMultiSig>;

// ======== Server side response model ========

export type RawAnyAuthDescriptor =
  | RawAuthDescriptor<RawSingleSig>
  | RawAuthDescriptor<RawMultiSig>;

export type RawAuthDescriptor<T extends RawAuthDescriptorArgs> = {
  args: T;
  account_id: Buffer;
  account_type: string;
  auth_type: string;
  created: number;
  id: Buffer;
  rules: RawRules | null;
  ctr: number;
};
