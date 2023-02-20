import { AuthType } from ".";
import {
  AuthDescriptor,
  AuthDescriptorRule,
  MultiSigAuthDescriptorArgs,
  SingleSigAuthDescriptorArgs,
} from "./types";

export function createSingleSignatureAuthDescriptor(
  args: SingleSigAuthDescriptorArgs,
  rules: AuthDescriptorRule | null
): AuthDescriptor {
  return [AuthType.single_sig, args, rules];
}

export function createMultiSignatureAuthDescriptor(
  args: MultiSigAuthDescriptorArgs,
  rules: AuthDescriptorRule | null
): AuthDescriptor {
  return [AuthType.multi_sig, args, rules];
}

export function singleSigArgs(
  flags: string[],
  signerPubKey: Buffer
): SingleSigAuthDescriptorArgs {
  return [[...new Set(flags)], signerPubKey];
}

export function multiSigArgs(
  flags: string[],
  requiredSignatures: number,
  signerPubKeys: Buffer[]
): MultiSigAuthDescriptorArgs {
  if (requiredSignatures > signerPubKeys.length) {
    throw new Error(
      "Number of required signatures have to be less or equal to number of pubkeys"
    );
  }
  return [[...new Set(flags)], requiredSignatures, signerPubKeys];
}

export const create = {
  singleSig: {
    authDescriptor: createSingleSignatureAuthDescriptor,
    withArgs: (flags: string[], signerPubKey: Buffer) => {
      const args = singleSigArgs(flags, signerPubKey);
      return {
        andRules: (rules: AuthDescriptorRule) =>
          createSingleSignatureAuthDescriptor(args, rules),
        andNoRules: () => createSingleSignatureAuthDescriptor(args, null),
      };
    },
  },
  multiSig: {
    authDescriptor: createMultiSignatureAuthDescriptor,
    withArgs: (
      flags: string[],
      requiredSignatures: number,
      signerPubKeys: Buffer[]
    ) => {
      const args = multiSigArgs(flags, requiredSignatures, signerPubKeys);
      return {
        andRules: (rules: AuthDescriptorRule) =>
          createMultiSignatureAuthDescriptor(args, rules),
        andNoRules: () => createMultiSignatureAuthDescriptor(args, null),
      };
    },
  },
};
