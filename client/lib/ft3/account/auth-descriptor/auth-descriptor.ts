import { formatter } from "postchain-client";
import { authDescriptor, serializeAuthType } from ".";
import { BufferId } from "../../../cryptoUtils";
import {
  AuthDescriptor,
  AuthDescriptorRule,
  AuthType,
  MultiSigAuthDescriptorArgs,
  SingleSigAuthDescriptorArgs,
} from "./types";

export function createSingleSignatureAuthDescriptor(
  args: SingleSigAuthDescriptorArgs,
  rules?: AuthDescriptorRule | null
): AuthDescriptor {
  return Object.freeze(
    authDescriptor.fromGtv([
      serializeAuthType(AuthType.single_sig),
      args,
      rules,
    ])
  );
}

export function createMultiSignatureAuthDescriptor(
  args: MultiSigAuthDescriptorArgs,
  rules: AuthDescriptorRule | null
): AuthDescriptor {
  return Object.freeze(
    authDescriptor.fromGtv([serializeAuthType(AuthType.multi_sig), args, rules])
  );
}

export function singleSigArgs(
  flags: string[],
  signerPubKey: BufferId
): SingleSigAuthDescriptorArgs {
  return Object.freeze([
    [...new Set(flags)],
    formatter.ensureBuffer(signerPubKey),
  ]);
}

export function multiSigArgs(
  flags: string[],
  requiredSignatures: number,
  signerPubKeys: BufferId[]
): MultiSigAuthDescriptorArgs {
  if (requiredSignatures > signerPubKeys.length) {
    throw new Error(
      "Number of required signatures have to be less or equal to number of pubkeys"
    );
  }
  return Object.freeze([
    [...new Set(flags)],
    requiredSignatures,
    signerPubKeys.map(formatter.ensureBuffer),
  ]);
}

export const create = {
  singleSig: {
    authDescriptor: createSingleSignatureAuthDescriptor,
    withArgs: (flags: string[], signerPubKey: BufferId) => {
      const args = singleSigArgs(flags, signerPubKey);
      return {
        andRules: (rules?: AuthDescriptorRule) =>
          createSingleSignatureAuthDescriptor(args, rules),
        andNoRules: createSingleSignatureAuthDescriptor(args, null),
      };
    },
  },
  multiSig: {
    authDescriptor: createMultiSignatureAuthDescriptor,
    withArgs: (
      flags: string[],
      requiredSignatures: number,
      signerPubKeys: BufferId[]
    ) => {
      const args = multiSigArgs(flags, requiredSignatures, signerPubKeys);
      return {
        andRules: (rules?: AuthDescriptorRule) =>
          createMultiSignatureAuthDescriptor(args, rules),
        andNoRules: createMultiSignatureAuthDescriptor(args, null),
      };
    },
  },
};
