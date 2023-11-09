import {
  AnyAuthDescriptor,
  AnyAuthDescriptorRegistration,
  AnySig,
  AuthDescriptor,
  AuthDescriptorRule,
  AuthType,
  ComplexAuthDescriptorRule,
  GtvAnyAuthDescriptor,
  GtvAuthDescriptor,
  GtvAuthDescriptorArgs,
  GtvAuthDescriptorRegistration,
  GtvAuthDescriptorRule,
  GtvAuthDescriptorRules,
  GtvSingleSigAuthDescriptorArgs,
  SingleSig,
} from "./types";

export function isSingleSigArgs(ad: AnySig): ad is SingleSig {
  return (ad as SingleSig).signer !== undefined;
}

export function isSimpleRule(
  rule: AuthDescriptorRule | ComplexAuthDescriptorRule,
): rule is AuthDescriptorRule {
  return (rule as ComplexAuthDescriptorRule).and === undefined;
}

export function isAuthDescriptorRegistrationGtv(
  ad:
    | GtvAuthDescriptorRegistration<GtvAuthDescriptorArgs>
    | AnyAuthDescriptorRegistration,
): ad is GtvAuthDescriptorRegistration<GtvAuthDescriptorArgs> {
  return Array.isArray(ad);
}

export function isSingleSigGtv(
  res: GtvAnyAuthDescriptor,
): res is GtvAuthDescriptor<GtvSingleSigAuthDescriptorArgs> {
  return res.auth_type === AuthType.SingleSig;
}

export function isSingleSig(
  ad: AnyAuthDescriptor,
): ad is AuthDescriptor<SingleSig> {
  return ad.authType === AuthType.SingleSig;
}

export function isGtvSimpleRule(
  rule: GtvAuthDescriptorRule | GtvAuthDescriptorRules,
): rule is GtvAuthDescriptorRule {
  return rule[0] !== "and";
}
