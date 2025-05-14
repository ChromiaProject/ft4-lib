import { enumValueFromString } from "@ft4/utils";
import { serializeAuthType } from "./enum-parsers";
import { isRawSingleSig, isSingleSigRegistration } from "./type-predicates";
import {
  AnyAuthDescriptor,
  AnyAuthDescriptorRegistration,
  AuthDescriptor,
  RawAnyAuthDescriptor,
  RawAuthDescriptor,
  MultiSig,
  SingleSig,
  AuthType,
  RawAnyAuthDescriptorRegistration,
  RawSingleSig,
  RawMultiSig,
} from "./types";
import { authDescriptorRuleMapper, rulesFromGtv, rulesToGtv } from "./rules";
import { gtv } from "postchain-client";

function parseBufferRules(rules: any) {
  if (Buffer.isBuffer(rules)) {
    return gtv.decode(rules);
  }

  if (rules instanceof Uint8Array) {
    return gtv.decode(Buffer.from(rules));
  }

  return rules;
}

export function mapSingleSigAuthDescriptor(
  ad: RawAuthDescriptor<RawSingleSig>,
): AuthDescriptor<SingleSig> {
  const { id, account_id, account_type, auth_type, args, rules, created } = ad;
  const [flags, signer] = args;
  const signerBuffer = Buffer.isBuffer(signer)
    ? signer
    : typeof signer === "string"
      ? Buffer.from(signer, "hex")
      : Array.isArray(signer)
        ? Buffer.from(signer)
        : signer;
  const parsedRules = rules ? parseBufferRules(rules) : rules;
  return Object.freeze({
    id,
    accountId: account_id,
    accountType: account_type,
    authType: enumValueFromString(auth_type, AuthType),
    args: {
      flags,
      signer: signerBuffer,
    },
    rules: parsedRules && rulesFromGtv(parsedRules, authDescriptorRuleMapper),
    created: new Date(created),
  });
}

export function mapMultiSigAuthDescriptor(
  ad: RawAuthDescriptor<RawMultiSig>,
): AuthDescriptor<MultiSig> {
  const { id, account_id, account_type, auth_type, args, rules, created } = ad;
  const [flags, signaturesRequired, signers] = args;
  const signersBuffer = Array.isArray(signers)
    ? signers.map((s) =>
        Buffer.isBuffer(s)
          ? s
          : typeof s === "string"
            ? Buffer.from(s, "hex")
            : Array.isArray(s)
              ? Buffer.from(s)
              : s,
      )
    : signers;
  const parsedRules = rules ? parseBufferRules(rules) : rules;
  return Object.freeze({
    id,
    accountId: account_id,
    accountType: account_type,
    authType: enumValueFromString(auth_type, AuthType),
    args: {
      flags,
      signaturesRequired,
      signers: signersBuffer,
    },
    rules: parsedRules && rulesFromGtv(parsedRules, authDescriptorRuleMapper),
    created: new Date(created),
  });
}

export function mapAuthDescriptorsFromGtv(
  response: RawAnyAuthDescriptor[],
): AnyAuthDescriptor[] {
  return response.map(authDescriptorFromGtv);
}

export function authDescriptorFromGtv(
  res: RawAnyAuthDescriptor,
): AnyAuthDescriptor {
  return isRawSingleSig(res)
    ? mapSingleSigAuthDescriptor(res)
    : mapMultiSigAuthDescriptor(res);
}

export function singleSigToGtv(args: SingleSig): RawSingleSig {
  return [[...new Set(args.flags)], args.signer];
}

export function multiSigToGtv(args: MultiSig): RawMultiSig {
  return [[...new Set(args.flags)], args.signaturesRequired, args.signers];
}

export function authDescriptorRegistrationToGtv(
  registration: AnyAuthDescriptorRegistration,
): RawAnyAuthDescriptorRegistration {
  const { authType, rules } = registration;
  return isSingleSigRegistration(registration)
    ? [
        serializeAuthType(authType),
        singleSigToGtv(registration.args),
        rules ? rulesToGtv(rules) : rules,
      ]
    : [
        serializeAuthType(authType),
        multiSigToGtv(registration.args),
        rules ? rulesToGtv(rules) : rules,
      ];
}
