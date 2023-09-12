import { formatter } from "postchain-client";
import { authDescriptor, serializeAuthType } from ".";
import { BufferId } from "../../../cryptoUtils";
import {
  AuthDescriptor,
  AuthDescriptorRule,
  AuthType,
  MultiSigAuthDescriptorArgs,
  RawAuthDescriptor,
  SingleSigAuthDescriptorArgs,
} from "./types";

export function createSingleSignatureAuthDescriptor(
  args: SingleSigAuthDescriptorArgs,
  rules: AuthDescriptorRule | null,
  created?: number
): AuthDescriptor {
  const fields: RawAuthDescriptor = [
    serializeAuthType(AuthType.single_sig),
    args,
    rules,
  ];
  return Object.freeze(
    authDescriptor.fromGtv([authDescriptor.getId(fields), ...fields, created])
  );
}

export function createMultiSignatureAuthDescriptor(
  args: MultiSigAuthDescriptorArgs,
  rules: AuthDescriptorRule | null,
  created?: number
): AuthDescriptor {
  const fields: RawAuthDescriptor = [
    serializeAuthType(AuthType.multi_sig),
    args,
    rules,
  ];
  return Object.freeze(
    authDescriptor.fromGtv([authDescriptor.getId(fields), ...fields, created])
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

function singleSigObj() {
  return {
    authDescriptor: createSingleSignatureAuthDescriptor,
    withArgs: (flags: string[], signerPubKey: BufferId) => {
      const args = singleSigArgs(flags, signerPubKey);
      return {
        andRules: (rules: AuthDescriptorRule | null) =>
          createSingleSignatureAuthDescriptor(args, rules),
        andNoRules: createSingleSignatureAuthDescriptor(args, null),
      };
    },
  };
}

function multiSigObj() {
  return {
    authDescriptor: createMultiSignatureAuthDescriptor,
    withArgs: (
      flags: string[],
      requiredSignatures: number,
      signerPubKeys: BufferId[]
    ) => {
      const args = multiSigArgs(flags, requiredSignatures, signerPubKeys);
      return {
        andRules: (rules: AuthDescriptorRule | null) =>
          createMultiSignatureAuthDescriptor(args, rules),
        andNoRules: createMultiSignatureAuthDescriptor(args, null),
      };
    },
  };
}

export const create = {
  singleSig: singleSigObj(),
  multiSig: multiSigObj(),
};
