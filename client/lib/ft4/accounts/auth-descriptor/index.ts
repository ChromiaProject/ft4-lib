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
  AuthDescriptorRules,
  AuthType,
  FlagsType,
  GtvAnyAuthDescriptor,
  GtvAuthDescriptorArgs,
  GtvAuthDescriptorRegistration,
  GtvMultiSigAuthDescriptorArgs,
  GtvSingleSigAuthDescriptorArgs,
  MultiSig,
  MultiSigAuthDescriptorArgs,
  RuleOperator,
  RuleVariable,
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

/**
 * Computes the account id that would be the result of creating
 * an account from the provided auth descriptor registration
 * @param firstAuthDescriptor registration to compute id for
 * @returns account id as Buffer
 */
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

/**
 * Creates a registration for a single signature auth descriptor
 * @param args the arguments to the auth descriptor registration
 * @param rule any rules to be included in the registration
 * @returns the created registration
 */
export function createSingleSignatureAuthDescriptorRegistration(
  args: SingleSigAuthDescriptorArgs,
  rule: AuthDescriptorRule | AuthDescriptorRules | null,
): AuthDescriptorRegistration<SingleSigAuthDescriptorArgs> {
  return {
    authType: AuthType.SingleSig,
    args,
    rule,
  };
}

/**
 * Creates a registration for a multi signature auth descriptor
 * @param args the arguments to the auth descriptor registration
 * @param rule any rules to be included in the registration
 * @returns the created registration
 */
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

/**
 * Creates a rule that can be added to an auth descriptor(registration)
 * @param variable what variable to use, see {@link RuleVariable}
 * @param operator the operator to use for this rule, see {@link RuleOperator}
 * @param value the value, or limit, for the variable/operator combination that this rule represents
 * @returns the created rule
 */
export function createAuthDescriptorRule(
  variable: RuleVariable,
  operator: RuleOperator,
  value: number,
): AuthDescriptorRule {
  return { variable, operator, value };
}

/**
 * Utility method that accepts an array of any kind of auth descriptor/auth descriptor registration
 * and returns an array of all of the signiners represented by the provided objects.
 * @param authDescriptors the auth descriptors(registrations) over which to aggregate signers
 * @returns a list of all of the composing signers
 */
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
  GtvAnyAuthDescriptor,
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
