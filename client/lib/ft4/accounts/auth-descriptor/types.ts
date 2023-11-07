import { Buffer } from "buffer";

export enum AuthType {
  single_sig = "S",
  multi_sig = "M",
}

export type AuthDescriptorSimpleRule = readonly [string, string, number];
export type AuthDescriptorRule = readonly [
  "and",
  ...AuthDescriptorSimpleRule[],
];

export type AuthDescriptor = {
  id: Buffer;
  authType: AuthType;
  flags: Set<string>;
  signaturesRequired: number;
  signers: Buffer[];
  rule: AuthDescriptorRule;
  created: number;
};

export type GtvAuthDescriptor = readonly [
  id: Buffer,
  authType: number,
  args: AuthDescriptorArgs,
  rule: AuthDescriptorRule | null,
  created: number,
];

export type MultiSigAuthDescriptorArgs = readonly [
  flags: string[],
  signaturesRequired: number,
  signers: Buffer[],
];

export type SingleSigAuthDescriptorArgs = readonly [
  flags: string[],
  signer: Buffer,
];

export type AuthDescriptorArgs =
  | SingleSigAuthDescriptorArgs
  | MultiSigAuthDescriptorArgs;

export type RawAuthDescriptor = [
  auth_type: number,
  args: AuthDescriptorArgs,
  rules: AuthDescriptorRule | null,
];

export type AuthDescriptorResponse = {
  args: AuthDescriptorArgs;
  auth_type: string;
  created: number;
  id: Buffer;
  rules: AuthDescriptorRule | null;
};
