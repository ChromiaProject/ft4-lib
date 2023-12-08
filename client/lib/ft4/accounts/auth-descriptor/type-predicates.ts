import { deserializeAuthType } from "./enum-parsers";
import {
  AnyAuthDescriptor,
  AnyAuthDescriptorRegistration,
  AuthDescriptor,
  AuthDescriptorComplexRule,
  AuthDescriptorRegistration,
  AuthDescriptorRules,
  AuthDescriptorSimpleRule,
  AuthType,
  MultiSig,
  RawAnyAuthDescriptor,
  RawAnyAuthDescriptorRegistration,
  RawAuthDescriptor,
  RawAuthDescriptorRule,
  RawComplexAuthDescriptorRule,
  RawSingleSig,
  SingleSig,
} from "./types";

export function isSingleSigArgs(ad: SingleSig | MultiSig): ad is SingleSig {
  return (ad as SingleSig).signer !== undefined;
}

export function isSimpleRule(
  rule: AuthDescriptorRules,
): rule is AuthDescriptorSimpleRule {
  return (rule as AuthDescriptorComplexRule).rules === undefined;
}

export function isRawAnyAuthDescriptorRegistration(
  ad: RawAnyAuthDescriptorRegistration | AnyAuthDescriptorRegistration,
): ad is RawAnyAuthDescriptorRegistration {
  return Array.isArray(ad);
}

export function isRawSingleSig(
  res: RawAnyAuthDescriptor | RawAnyAuthDescriptorRegistration,
): res is RawAuthDescriptor<RawSingleSig> {
  return (
    (res as RawAnyAuthDescriptor).auth_type === AuthType.SingleSig ||
    deserializeAuthType((res as RawAnyAuthDescriptorRegistration)[0]) ===
      AuthType.SingleSig
  );
}

export function isSingleSigRegistration(
  res: AnyAuthDescriptorRegistration,
): res is AuthDescriptorRegistration<SingleSig> {
  return res.authType === AuthType.SingleSig;
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
