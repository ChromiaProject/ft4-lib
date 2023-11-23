import {
  AnyAuthDescriptor,
  AnyAuthDescriptorRegistration,
  AnySig,
  AuthDescriptor,
  AuthDescriptorRule,
  AuthType,
  ComplexAuthDescriptorRule,
  RawAnyAuthDescriptor,
  RawAuthDescriptor,
  RawAuthDescriptorArgs,
  RawAuthDescriptorRegistration,
  RawAuthDescriptorRule,
  RawComplexAuthDescriptorRule,
  RawSingleSigAuthDescriptorArgs,
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
    | RawAuthDescriptorRegistration<RawAuthDescriptorArgs>
    | AnyAuthDescriptorRegistration,
): ad is RawAuthDescriptorRegistration<RawAuthDescriptorArgs> {
  return Array.isArray(ad);
}

export function isSingleSigGtv(
  res: RawAnyAuthDescriptor,
): res is RawAuthDescriptor<RawSingleSigAuthDescriptorArgs> {
  return res.auth_type === AuthType.SingleSig;
}

export function isSingleSig(
  ad: AnyAuthDescriptor,
): ad is AuthDescriptor<SingleSig> {
  return ad.authType === AuthType.SingleSig;
}

export function isGtvSimpleRule(
  rule: RawAuthDescriptorRule | RawComplexAuthDescriptorRule,
): rule is RawAuthDescriptorRule {
  return rule[0] !== "and";
}
