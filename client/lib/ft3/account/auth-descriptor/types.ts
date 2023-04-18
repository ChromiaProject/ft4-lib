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

export type AuthDescriptor = readonly [
  authType: string,
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
