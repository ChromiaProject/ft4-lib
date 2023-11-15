import {
  authTypeFromString,
  ruleOperatorFromString,
  ruleVariableFromString,
  serializeAuthType,
} from "./enum-parsers";
import {
  isGtvSimpleRule,
  isSimpleRule,
  isSingleSigArgs,
  isSingleSigGtv,
} from "./type-predicates";
import {
  AnyAuthDescriptor,
  AnyAuthDescriptorRegistration,
  AuthDescriptor,
  AuthDescriptorRule,
  ComplexAuthDescriptorRule,
  RawAnyAuthDescriptor,
  RawAuthDescriptor,
  RawAuthDescriptorArgs,
  RawAuthDescriptorRegistration,
  RawAuthDescriptorRule,
  RawAuthDescriptorRules,
  RawMultiSigAuthDescriptorArgs,
  RawSingleSigAuthDescriptorArgs,
  MultiSig,
  MultiSigAuthDescriptorArgs,
  SingleSig,
  SingleSigAuthDescriptorArgs,
} from "./types";

export function mapSingleSigAuthDescriptor(
  ad: RawAuthDescriptor<RawSingleSigAuthDescriptorArgs>,
): AuthDescriptor<SingleSig> {
  const { id, auth_type, args, rules, created } = ad;
  const [flags, signer] = args;
  return Object.freeze({
    id,
    authType: authTypeFromString(auth_type),
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
  const a = Object.freeze({
    id,
    authType: authTypeFromString(auth_type),
    args: {
      flags,
      signaturesRequired,
      signers,
    },
    rule: rules ? rulesFromGtv(rules) : rules,
    created,
  });
  return a;
}

export function mapAuthDescriptors(
  response: RawAnyAuthDescriptor[],
): AnyAuthDescriptor[] {
  return response.map((res) =>
    isSingleSigGtv(res)
      ? mapSingleSigAuthDescriptor(res)
      : mapMultiSigAuthDescriptor(res),
  );
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
): RawAuthDescriptorRegistration<RawAuthDescriptorArgs> {
  const { authType, args, rule } = registration;
  return [
    serializeAuthType(authType),
    isSingleSigArgs(args)
      ? singleSigAuthDescriptorArgsToGtv(args)
      : multiSigAuthDescriptorArgsToGtv(args),
    rule ? rulesToGtv(rule) : rule,
  ];
}

export function rulesFromGtv(
  gtvRules: RawAuthDescriptorRule | RawAuthDescriptorRules,
): AuthDescriptorRule | ComplexAuthDescriptorRule {
  const mapRule = (gtv: RawAuthDescriptorRule) => ({
    operator: ruleOperatorFromString(gtv[0]),
    variable: ruleVariableFromString(gtv[1]),
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
): RawAuthDescriptorRule | RawAuthDescriptorRules {
  const toGtv = (rule: AuthDescriptorRule): RawAuthDescriptorRule => [
    rule.operator,
    rule.variable,
    rule.value,
  ];

  if (isSimpleRule(rule)) {
    return toGtv(rule);
  }

  const flattenRules = (
    rule: ComplexAuthDescriptorRule | AuthDescriptorRule,
  ): AuthDescriptorRule[] => {
    if (isSimpleRule(rule)) {
      return [rule];
    }
    return rule.and.flatMap(flattenRules);
  };

  return ["and", ...flattenRules(rule).map(toGtv)];
}
