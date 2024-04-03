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

export function mapSingleSigAuthDescriptor(
  ad: RawAuthDescriptor<RawSingleSig>,
): AuthDescriptor<SingleSig> {
  const { id, account_id, auth_type, args, rules, created } = ad;
  const [flags, signer] = args;
  return Object.freeze({
    id,
    accountId: account_id,
    authType: enumValueFromString(auth_type, AuthType),
    args: {
      flags,
      signer,
    },
    rules: rules && rulesFromGtv(rules, authDescriptorRuleMapper),
    created: new Date(created),
  });
}

export function mapMultiSigAuthDescriptor(
  ad: RawAuthDescriptor<RawMultiSig>,
): AuthDescriptor<MultiSig> {
  const { id, account_id, auth_type, args, rules, created } = ad;
  const [flags, signaturesRequired, signers] = args;
  return Object.freeze({
    id,
    accountId: account_id,
    authType: enumValueFromString(auth_type, AuthType),
    args: {
      flags,
      signaturesRequired,
      signers,
    },
    rules: rules && rulesFromGtv(rules, authDescriptorRuleMapper),
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
