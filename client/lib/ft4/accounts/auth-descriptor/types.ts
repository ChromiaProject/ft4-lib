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

export class AuthDescriptorError extends Error {
  constructor(msg?: string) {
    super(msg);
    this.name = "AuthDescriptorError";
  }
}

// ======== Client side data model ============

export type AuthDescriptorRule = {
  variable: RuleVariable;
  operator: RuleOperator;
  value: number;
};

export type AuthDescriptorAndRule = {
  and: (AuthDescriptorRule | ComplexAuthDescriptorRule)[];
  or?: never;
};
// type AuthDescriptorOrRule = {
//   and?: never
//   or: ComplexAuthDescriptorRule[]
// }
export type ComplexAuthDescriptorRule = AuthDescriptorAndRule; // | AuthDescriptorOrRule

export type AuthDescriptor<T extends AnySig> = {
  id: Buffer;
  authType: AuthType;
  rule: AuthDescriptorRule | ComplexAuthDescriptorRule | null;
  created: number;
  args: T;
};

export type AuthDescriptorRegistration<T extends AnySig> = {
  authType: AuthType;
  args: T;
  rule: AuthDescriptorRule | ComplexAuthDescriptorRule | null;
};

export type AnyAuthDescriptor =
  | AuthDescriptor<SingleSig>
  | AuthDescriptor<MultiSig>;
export type AnyAuthDescriptorRegistration =
  | AuthDescriptorRegistration<SingleSig>
  | AuthDescriptorRegistration<MultiSig>;

export type AnySig = SingleSig | MultiSig;
export type SingleSig = SingleSigAuthDescriptorArgs;
export type MultiSig = MultiSigAuthDescriptorArgs;

export type SingleSigAuthDescriptorArgs = {
  flags: string[];
  signer: Buffer;
};

export type MultiSigAuthDescriptorArgs = {
  flags: string[];
  signaturesRequired: number;
  signers: Buffer[];
};

// ======== Server side =======================
export type RawMultiSigAuthDescriptorArgs = readonly [
  flags: string[],
  signaturesRequired: number,
  signers: Buffer[],
];

export type RawSingleSigAuthDescriptorArgs = readonly [
  flags: string[],
  signer: Buffer,
];

export type RawAuthDescriptorArgs =
  | RawSingleSigAuthDescriptorArgs
  | RawMultiSigAuthDescriptorArgs;

export type RawAuthDescriptorRule = readonly [string, string, number];
export type RawAuthDescriptorRules = readonly [
  "and",
  ...RawAuthDescriptorRule[],
];

// ======== Server side request model =========

export type RawAuthDescriptorRegistration<T extends RawAuthDescriptorArgs> =
  readonly [
    auth_type: number,
    args: T,
    rules: RawAuthDescriptorRule | RawAuthDescriptorRules | null,
  ];

export type RawAnyAuthDescriptorRegistration =
  | RawAuthDescriptorRegistration<RawSingleSigAuthDescriptorArgs>
  | RawAuthDescriptorRegistration<RawMultiSigAuthDescriptorArgs>;

// ======== Server side response model ========

export type RawAnyAuthDescriptor =
  | RawAuthDescriptor<RawSingleSigAuthDescriptorArgs>
  | RawAuthDescriptor<RawMultiSigAuthDescriptorArgs>;

export type RawAuthDescriptor<T extends RawAuthDescriptorArgs> = {
  args: T;
  auth_type: string;
  created: number;
  id: Buffer;
  rules: RawAuthDescriptorRule | RawAuthDescriptorRules | null;
};
