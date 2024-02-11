import { Buffer } from "buffer";

export enum FlagsType {
  Account = "A", // Change Account settings
  Transfer = "T", // Transfer balance
}

export enum AuthType {
  SingleSig = "S",
  MultiSig = "M",
}

export enum RuleVariable {
  BlockHeight = "block_height",
  BlockTime = "block_time",
  OpCount = "op_count",
}

export enum RuleOperator {
  LessThan = "lt",
  LessOrEqual = "le",
  Equals = "eq",
  GreaterThan = "gt",
  GreaterOrEqual = "ge",
}

export type EnumLike = Record<string, string | number>;

export class AuthDescriptorError extends Error {
  constructor(msg?: string) {
    super(msg);
    this.name = "AuthDescriptorError";
  }
}

// ======== Client side data model ============

export type AuthDescriptorSimpleRule = {
  variable: RuleVariable;
  operator: RuleOperator;
  value: number;
};

export type AuthDescriptorComplexRule = {
  operator: "and";
  rules: AuthDescriptorSimpleRule[];
};
export type AuthDescriptorRules =
  | AuthDescriptorSimpleRule
  | AuthDescriptorComplexRule;

export type AuthDescriptor<T extends SingleSig | MultiSig> = {
  id: Buffer;
  accountId: Buffer;
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

export type RawAuthDescriptorSimpleRule = readonly [string, string, number];
export type RawAuthDescriptorComplexRule = readonly [
  "and",
  ...RawAuthDescriptorSimpleRule[],
];

export type RawAuthDescriptorRules =
  | RawAuthDescriptorSimpleRule
  | RawAuthDescriptorComplexRule;

// ======== Server side request model =========

type RawAuthDescriptorArgs = RawSingleSig | RawMultiSig;
export type RawAuthDescriptorRegistration<T extends RawAuthDescriptorArgs> =
  readonly [auth_type: number, args: T, rules: RawAuthDescriptorRules | null];

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
  auth_type: string;
  created: number;
  id: Buffer;
  rules: RawAuthDescriptorRules | null;
};
