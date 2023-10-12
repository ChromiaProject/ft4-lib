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
  GtvAnyAuthDescriptor,
  GtvAuthDescriptor,
  GtvAuthDescriptorArgs,
  GtvAuthDescriptorRegistration,
  GtvAuthDescriptorRule,
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
      : mapMultiSigAuthDescriptor(
          res as GtvAuthDescriptor<GtvMultiSigAuthDescriptorArgs>,
        ),
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
  gtvRules: GtvAuthDescriptorRule,
): AuthDescriptorRule {
  if (isGtvSimpleRule(gtvRules)) {
    return {
      variable: ruleVariableFromString(gtvRules[0]),
      operator: ruleOperatorFromString(gtvRules[1]),
      value: gtvRules[2],
    };
  } else {
    return {
      lhs: rulesFromGtv(gtvRules[0]),
      rhs: rulesFromGtv(gtvRules[2]),
    };
  }
}

export function rulesToGtv(rules: AuthDescriptorRule): GtvAuthDescriptorRule {
  if (isSimpleRule(rules)) {
    return [rules.variable, rules.operator, rules.value];
  }
  return [rulesToGtv(rules.lhs), "and", rulesToGtv(rules.rhs)];
}
