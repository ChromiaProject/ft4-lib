export enum AuthType {
  single_sig = "S",
  multi_sig = "M",
  external_single_sig = "ES",
  external_multi_sig = "EM",
}

export type AuthDescriptorSimpleRule = readonly [string, string, number];
export type AuthDescriptorCompositeRule = readonly [
  AuthDescriptorAnyRule,
  "and",
  AuthDescriptorAnyRule
];
type AuthDescriptorAnyRule =
  | AuthDescriptorCompositeRule
  | AuthDescriptorSimpleRule;
export type AuthDescriptorRule = AuthDescriptorAnyRule;

export type AuthDescriptor = {
  id: Buffer;
  authType: string;
  flags: Set<string>;
  signaturesRequired: number;
  signers: Buffer[];
  rule: AuthDescriptorRule;
};

export type GtvAuthDescriptor = readonly [
  authType: number,
  args: AuthDescriptorArgs,
  rule: AuthDescriptorRule | null
];

export type MultiSigAuthDescriptorArgs = readonly [
  flags: string[],
  signaturesRequired: number,
  signers: Buffer[]
];

export type SingleSigAuthDescriptorArgs = readonly [
  flags: string[],
  signer: Buffer
];

export type AuthDescriptorArgs =
  | SingleSigAuthDescriptorArgs
  | MultiSigAuthDescriptorArgs;

export type RawAuthDescriptor = {
  auth_type: string;
  args: AuthDescriptorArgs;
  rules: AuthDescriptorRule | null;
};
