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
  AuthDescriptorRule,
  ComplexAuthDescriptorRule,
  RawAnyAuthDescriptor,
  RawAuthDescriptor,
  RawAuthDescriptorRule,
  RawComplexAuthDescriptorRule,
  RawMultiSigAuthDescriptorArgs,
  RawSingleSigAuthDescriptorArgs,
  MultiSig,
  MultiSigAuthDescriptorArgs,
  SingleSig,
  SingleSigAuthDescriptorArgs,
  AuthType,
  RuleOperator,
  RuleVariable,
  RawAnyAuthDescriptorRegistration,
} from "./types";

export function mapSingleSigAuthDescriptor(
  ad: RawAuthDescriptor<RawSingleSigAuthDescriptorArgs>,
): AuthDescriptor<SingleSig> {
  const { id, auth_type, args, rules, created } = ad;
  const [flags, signer] = args;
  return Object.freeze({
    id,
    authType: enumValueFromString(auth_type, AuthType),
    args: {
      flags,
      signer,
    },
    rule: rules ? rulesFromGtv(rules) : rules,
    created,
  });
}

export function mapMultiSigAuthDescriptor(
  ad: RawAuthDescriptor<RawMultiSigAuthDescriptorArgs>,
): AuthDescriptor<MultiSig> {
  const { id, auth_type, args, rules, created } = ad;
  const [flags, signaturesRequired, signers] = args;
  return Object.freeze({
    id,
    authType: enumValueFromString(auth_type, AuthType),
    args: {
      flags,
      signaturesRequired,
      signers,
    },
    rule: rules ? rulesFromGtv(rules) : rules,
    created,
  });
}

export function mapAuthDescriptors(
  response: RawAnyAuthDescriptor[],
): AnyAuthDescriptor[] {
  return response.map(mapOneAuthDescriptor);
}

export function mapOneAuthDescriptor(
  res: RawAnyAuthDescriptor,
): AnyAuthDescriptor {
  return isRawSingleSig(res)
    ? mapSingleSigAuthDescriptor(res)
    : mapMultiSigAuthDescriptor(res);
}

export function singleSigAuthDescriptorArgsToGtv(
  args: SingleSigAuthDescriptorArgs,
): RawSingleSigAuthDescriptorArgs {
  return [[...new Set(args.flags)], args.signer];
}

export function multiSigAuthDescriptorArgsToGtv(
  args: MultiSigAuthDescriptorArgs,
): RawMultiSigAuthDescriptorArgs {
  return [[...new Set(args.flags)], args.signaturesRequired, args.signers];
}

export function authDescriptorRegistrationToGtv(
  registration: AnyAuthDescriptorRegistration,
): RawAnyAuthDescriptorRegistration {
  const { authType, rule } = registration;
  return isSingleSigRegistration(registration)
    ? [
        serializeAuthType(authType),
        singleSigAuthDescriptorArgsToGtv(registration.args),
        rule ? rulesToGtv(rule) : rule,
      ]
    : [
        serializeAuthType(authType),
        multiSigAuthDescriptorArgsToGtv(registration.args),
        rule ? rulesToGtv(rule) : rule,
      ];
}

export function rulesFromGtv(
  gtvRules: RawAuthDescriptorRule | RawComplexAuthDescriptorRule,
): AuthDescriptorRule | ComplexAuthDescriptorRule {
  const mapRule = (gtv: RawAuthDescriptorRule) => ({
    operator: enumValueFromString(gtv[0], RuleOperator),
    variable: enumValueFromString(gtv[1], RuleVariable),
    value: gtv[2],
  });
  if (isGtvSimpleRule(gtvRules)) {
    return mapRule(gtvRules);
  } else {
    return {
      and: gtvRules.slice(1).map((v) => mapRule(v as RawAuthDescriptorRule)),
    };
  }
}

export function rulesToGtv(
  rule: AuthDescriptorRule | ComplexAuthDescriptorRule,
): RawAuthDescriptorRule | RawComplexAuthDescriptorRule {
  const toGtv = (rule: AuthDescriptorRule): RawAuthDescriptorRule => [
    rule.operator,
    rule.variable,
    rule.value,
  ];

  if (isSimpleRule(rule)) {
    return toGtv(rule);
  }

  const flattenRules = (
    rule: ComplexAuthDescriptorRule,
  ): AuthDescriptorRule[] => {
    if (isSimpleRule(rule)) {
      return [rule];
    }
    return rule.and.flatMap(flattenRules);
  };

  return ["and", ...flattenRules(rule).map(toGtv)];
}
