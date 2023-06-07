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
  type: AuthType.single_sig | AuthType.external_single_sig,
  args: SingleSigAuthDescriptorArgs,
  rules?: AuthDescriptorRule | null
): AuthDescriptor {
  return Object.freeze(
    authDescriptor.fromGtv([serializeAuthType(type), args, rules])
  );
}

export function createMultiSignatureAuthDescriptor(
  type: AuthType.multi_sig | AuthType.external_multi_sig,
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

export class AuthDescriptorError extends Error {
  constructor(msg?) {
    super(msg);
    this.message = msg;
    this.name = "SignatureCountError";
  }
}

export function multiSigArgs(
  flags: string[],
  requiredSignatures: number,
  signerPubKeys: BufferId[]
): MultiSigAuthDescriptorArgs {
  if (requiredSignatures > signerPubKeys.length) {
    throw new AuthDescriptorError(
      "Number of required signatures have to be less or equal to number of pubkeys"
    );
  }
  return Object.freeze([
    [...new Set(flags)],
    requiredSignatures,
    signerPubKeys.map(formatter.ensureBuffer),
  ]);
}

function signleSigObj(
  type: AuthType.single_sig | AuthType.external_single_sig
) {
  return {
    authDescriptor: createSingleSignatureAuthDescriptor,
    withArgs: (flags: string[], signerPubKey: BufferId) => {
      const args = singleSigArgs(flags, signerPubKey);
      return {
        andRules: (rules?: AuthDescriptorRule) =>
          createSingleSignatureAuthDescriptor(type, args, rules),
        andNoRules: createSingleSignatureAuthDescriptor(type, args, null),
      };
    },
  };
}

function multiSigObj(type: AuthType.multi_sig | AuthType.external_multi_sig) {
  return {
    authDescriptor: createMultiSignatureAuthDescriptor,
    withArgs: (
      flags: string[],
      requiredSignatures: number,
      signerPubKeys: BufferId[]
    ) => {
      const args = multiSigArgs(flags, requiredSignatures, signerPubKeys);
      return {
        andRules: (rules?: AuthDescriptorRule) =>
          createMultiSignatureAuthDescriptor(type, args, rules),
        andNoRules: createMultiSignatureAuthDescriptor(type, args, null),
      };
    },
  };
}

export const create = {
  singleSig: signleSigObj(AuthType.single_sig),
  singleSigEvm: signleSigObj(AuthType.external_single_sig),
  multiSig: multiSigObj(AuthType.multi_sig),
  multiSigEvm: multiSigObj(AuthType.external_multi_sig),
};
