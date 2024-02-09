import { enumValueFromString, serializeAuthType } from "./enum-parsers";
import {
  isGtvSimpleRule,
  isSimpleRule,
  isRawSingleSig,
  isSingleSigRegistration,
} from "./type-predicates";
import {
  AnyAuthDescriptor,
  AnyAuthDescriptorRegistration,
  AuthDescriptor,
  RawAnyAuthDescriptor,
  RawAuthDescriptor,
  RawAuthDescriptorSimpleRule,
  MultiSig,
  SingleSig,
  AuthType,
  RuleOperator,
  RuleVariable,
  RawAnyAuthDescriptorRegistration,
  RawSingleSig,
  RawMultiSig,
  AuthDescriptorRules,
  AuthDescriptorSimpleRule,
  RawAuthDescriptorRules,
} from "./types";

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
    rules: rules ? rulesFromGtv(rules) : rules,
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
    rules: rules ? rulesFromGtv(rules) : rules,
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

export function rulesFromGtv(
  gtvRules: RawAuthDescriptorRules,
): AuthDescriptorRules {
  const mapRule = (gtv: RawAuthDescriptorSimpleRule) => ({
    operator: enumValueFromString(gtv[0], RuleOperator),
    variable: enumValueFromString(gtv[1], RuleVariable),
    value: gtv[2],
  });
  if (isGtvSimpleRule(gtvRules)) {
    return mapRule(gtvRules);
  } else {
    return {
      operator: "and",
      rules: gtvRules
        .slice(1)
        .map((v) => mapRule(v as RawAuthDescriptorSimpleRule)),
    };
  }
}

export function rulesToGtv(
  rule: AuthDescriptorRules,
): RawAuthDescriptorRules | null {
  if (!rule) return null;

  const toGtv = (
    rule: AuthDescriptorSimpleRule,
  ): RawAuthDescriptorSimpleRule => [rule.operator, rule.variable, rule.value];

  if (isSimpleRule(rule)) {
    return toGtv(rule);
  }

  return ["and", ...rule.rules.map(toGtv)];
}
