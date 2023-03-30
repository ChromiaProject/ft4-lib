export type AuthDescriptorRule = readonly string[];

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
