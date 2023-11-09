import {
  authTypeFromString,
  deserializeRuleOperator,
  deserializeRuleVariable,
  serializeAuthType,
  serializeRuleOperator,
  serializeRuleVariable,
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
  GtvAnyAuthDescriptor,
  GtvAuthDescriptor,
  GtvAuthDescriptorArgs,
  GtvAuthDescriptorRegistration,
  GtvAuthDescriptorRule,
  GtvAuthDescriptorRules,
  GtvMultiSigAuthDescriptorArgs,
  GtvSingleSigAuthDescriptorArgs,
  MultiSig,
  MultiSigAuthDescriptorArgs,
  SingleSig,
  SingleSigAuthDescriptorArgs,
} from "./types";

export function mapSingleSigAuthDescriptor(
  ad: GtvAuthDescriptor<GtvSingleSigAuthDescriptorArgs>,
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
  ad: GtvAuthDescriptor<GtvMultiSigAuthDescriptorArgs>,
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
  response: GtvAnyAuthDescriptor[],
): AnyAuthDescriptor[] {
  return response.map((res) =>
    isSingleSigGtv(res)
      ? mapSingleSigAuthDescriptor(res)
      : mapMultiSigAuthDescriptor(res),
  );
}

export function singleSigAuthDescriptorArgsToGtv(
  args: SingleSigAuthDescriptorArgs,
): GtvSingleSigAuthDescriptorArgs {
  return [[...new Set(args.flags)], args.signer];
}

export function multiSigAuthDescriptorArgsToGtv(
  args: MultiSigAuthDescriptorArgs,
): GtvMultiSigAuthDescriptorArgs {
  return [[...new Set(args.flags)], args.signaturesRequired, args.signers];
}

export function authDescriptorRegistrationToGtv(
  registration: AnyAuthDescriptorRegistration,
): GtvAuthDescriptorRegistration<GtvAuthDescriptorArgs> {
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
  gtvRules: GtvAuthDescriptorRule | GtvAuthDescriptorRules,
): AuthDescriptorRule | ComplexAuthDescriptorRule {
  const mapRule = (gtv: GtvAuthDescriptorRule) => ({
    operator: deserializeRuleOperator(gtv[1]),
    variable: deserializeRuleVariable(gtv[0]),
    value: gtv[2],
  });
  if (isGtvSimpleRule(gtvRules)) {
    return mapRule(gtvRules);
  } else {
    return {
      and: gtvRules.slice(1).map((v) => mapRule(v as GtvAuthDescriptorRule)),
    };
  }
}

export function rulesToGtv(
  rule: AuthDescriptorRule | ComplexAuthDescriptorRule,
): GtvAuthDescriptorRule | GtvAuthDescriptorRules {
  const toGtv = (rule: AuthDescriptorRule): GtvAuthDescriptorRule => [
    serializeRuleOperator(rule.operator),
    serializeRuleVariable(rule.variable),
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
