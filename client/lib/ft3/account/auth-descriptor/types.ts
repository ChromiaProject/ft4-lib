export type AuthDescriptorRule = string[];

export type AuthDescriptor = [
  authType: string,
  args: AuthDescriptorArgs,
  rule: AuthDescriptorRule | null
];

export type MultiSigAuthDescriptorArgs = [
  flags: string[],
  signaturesRequired: number,
  signers: Buffer[]
];

export type SingleSigAuthDescriptorArgs = [flags: string[], signer: Buffer];

export type AuthDescriptorArgs =
  | SingleSigAuthDescriptorArgs
  | MultiSigAuthDescriptorArgs;
