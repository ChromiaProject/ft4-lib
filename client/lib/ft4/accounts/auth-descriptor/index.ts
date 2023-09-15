import { Buffer } from "buffer";
import { gtv as pclGtv } from "postchain-client";
import { authDescriptorRegistrationToGtv, mapAuthDescriptors } from "./gtv";
import {
  AnyAuthDescriptor,
  AnyAuthDescriptorRegistration,
  AnySig,
  AuthDescriptor,
  AuthDescriptorError,
  AuthDescriptorRegistration,
  AuthDescriptorRule,
  AuthType,
  CompositeRuleExpression,
  FlagsType,
  GtvAuthDescriptorArgs,
  GtvAuthDescriptorRegistration,
  GtvAuthDescriptorResponse,
  GtvMultiSigAuthDescriptorArgs,
  GtvSingleSigAuthDescriptorArgs,
  MultiSig,
  MultiSigAuthDescriptorArgs,
  RuleOperator,
  RuleVariable,
  SimpleRuleExpression,
  SingleSig,
  SingleSigAuthDescriptorArgs,
} from "./types";
import {
  isAuthDescriptorRegistrationGtv,
  isSingleSigArgs,
} from "./type-predicates";

function hashAuthDescriptor(
  ad: GtvAuthDescriptorRegistration<
    GtvSingleSigAuthDescriptorArgs | GtvMultiSigAuthDescriptorArgs
  >,
) {
  return pclGtv.gtvHash(ad);
}

export function deriveAccountId(
  firstAuthDescriptor:
    | GtvAuthDescriptorRegistration<GtvAuthDescriptorArgs>
    | AnyAuthDescriptorRegistration,
): Buffer {
  const ad = isAuthDescriptorRegistrationGtv(firstAuthDescriptor)
    ? firstAuthDescriptor
    : authDescriptorRegistrationToGtv(firstAuthDescriptor);
  return hashAuthDescriptor(ad);
}

export function createSingleSignatureAuthDescriptorRegistration(
  args: SingleSigAuthDescriptorArgs,
  rule: AuthDescriptorRule | null,
): AuthDescriptorRegistration<SingleSigAuthDescriptorArgs> {
  return {
    authType: AuthType.SingleSig,
    args,
    rule,
  };
}

export function createMultiSignatureAuthDescriptorRegistration(
  args: MultiSigAuthDescriptorArgs,
  rule: AuthDescriptorRule | null,
): AuthDescriptorRegistration<MultiSigAuthDescriptorArgs> {
  return {
    authType: AuthType.MultiSig,
    args,
    rule,
  };
}

export function createSimpleRule(
  variable: RuleVariable,
  operator: RuleOperator,
  value: number,
): SimpleRuleExpression {
  return { variable, operator, value };
}

export function createCompositeRule(
  lhs: AuthDescriptorRule,
  rhs: AuthDescriptorRule,
) {
  return { lhs, rhs };
}

export function aggregateSigners(
  ...authDescriptors: AnyAuthDescriptor[] | AnyAuthDescriptorRegistration[]
): Buffer[] {
  return authDescriptors.flatMap(
    (ad: AnyAuthDescriptor | AnyAuthDescriptorRegistration) =>
      isSingleSigArgs(ad.args) ? [ad.args.signer] : ad.args.signers,
  );
}

export {
  AnyAuthDescriptor,
  GtvAuthDescriptorArgs,
  GtvAuthDescriptorResponse,
  GtvAuthDescriptorRegistration,
  FlagsType,
  SingleSig,
  MultiSig,
  AnySig,
  AuthType,
  AuthDescriptor,
  RuleVariable,
  RuleOperator,
  AuthDescriptorError,
  SimpleRuleExpression,
  CompositeRuleExpression,
  AuthDescriptorRule,
  AuthDescriptorRegistration,
  AnyAuthDescriptorRegistration,
  SingleSigAuthDescriptorArgs,
  MultiSigAuthDescriptorArgs,
};

export const gtv = {
  authDescriptorRegistrationToGtv,
  mapAuthDescriptors,
};
