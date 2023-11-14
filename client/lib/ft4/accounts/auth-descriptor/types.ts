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
export type GtvMultiSigAuthDescriptorArgs = readonly [
  flags: string[],
  signaturesRequired: number,
  signers: Buffer[],
];

export type GtvSingleSigAuthDescriptorArgs = readonly [
  flags: string[],
  signer: Buffer,
];

export type GtvAuthDescriptorArgs =
  | GtvSingleSigAuthDescriptorArgs
  | GtvMultiSigAuthDescriptorArgs;

export type GtvAuthDescriptorRule = readonly [string, string, number];
export type GtvAuthDescriptorRules = readonly [
  "and",
  ...GtvAuthDescriptorRule[],
];

// ======== Server side request model =========

export type GtvAuthDescriptorRegistration<T extends GtvAuthDescriptorArgs> =
  readonly [
    auth_type: number,
    args: T,
    rules: GtvAuthDescriptorRule | GtvAuthDescriptorRules | null,
  ];

export type GtvAnyAuthDescriptorRegistration =
  | GtvAuthDescriptorRegistration<GtvSingleSigAuthDescriptorArgs>
  | GtvAuthDescriptorRegistration<GtvMultiSigAuthDescriptorArgs>;

// ======== Server side response model ========

export type GtvAnyAuthDescriptor =
  | GtvAuthDescriptor<GtvSingleSigAuthDescriptorArgs>
  | GtvAuthDescriptor<GtvMultiSigAuthDescriptorArgs>;

export type GtvAuthDescriptor<T extends GtvAuthDescriptorArgs> = {
  args: T;
  auth_type: string;
  created: number;
  id: Buffer;
  rules: GtvAuthDescriptorRule | GtvAuthDescriptorRules | null;
};
