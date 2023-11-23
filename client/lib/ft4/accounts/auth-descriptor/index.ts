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
  ComplexAuthDescriptorRule,
  AuthDescriptorAndRule,
  FlagsType,
  RawAnyAuthDescriptor,
  RawAuthDescriptorArgs,
  RawAuthDescriptorRegistration,
  RawMultiSigAuthDescriptorArgs,
  RawSingleSigAuthDescriptorArgs,
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
import {
  and,
  blockHeight,
  blockTime,
  equals,
  greaterOrEqual,
  greaterThan,
  lessOrEqual,
  lessThan,
  opCount,
} from "./rules";

function hashAuthDescriptor(
  ad: RawAuthDescriptorRegistration<
    RawSingleSigAuthDescriptorArgs | RawMultiSigAuthDescriptorArgs
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
export function deriveAuthDescriptorId(
  firstAuthDescriptor:
    | RawAuthDescriptorRegistration<RawAuthDescriptorArgs>
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
export function createSingleSigAuthDescriptorRegistration(
  flags: string[],
  signer: Buffer,
  rule: AuthDescriptorRule | ComplexAuthDescriptorRule | null,
): AuthDescriptorRegistration<SingleSigAuthDescriptorArgs> {
  return {
    authType: AuthType.SingleSig,
    args: { flags, signer },
    rule,
  };
}

/**
 * Creates a registration for a multi signature auth descriptor
 * @param args the arguments to the auth descriptor registration
 * @param rule any rules to be included in the registration
 * @returns the created registration
 */
export function createMultiSigAuthDescriptorRegistration(
  flags: string[],
  signers: Buffer[],
  signaturesRequired: number,
  rule: AuthDescriptorRule | ComplexAuthDescriptorRule | null,
): AuthDescriptorRegistration<MultiSigAuthDescriptorArgs> {
  return {
    authType: AuthType.MultiSig,
    args: { flags, signers, signaturesRequired },
    rule,
  };
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
  RawAuthDescriptorArgs as GtvAuthDescriptorArgs,
  RawAnyAuthDescriptor as GtvAnyAuthDescriptor,
  RawAuthDescriptorRegistration as GtvAuthDescriptorRegistration,
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
  ComplexAuthDescriptorRule,
  AuthDescriptorAndRule,
  AuthDescriptorRegistration,
  AnyAuthDescriptorRegistration,
  SingleSigAuthDescriptorArgs,
  MultiSigAuthDescriptorArgs,
  blockHeight,
  blockTime,
  opCount,
  lessThan,
  lessOrEqual,
  equals,
  greaterThan,
  greaterOrEqual,
  and,
};

export const gtv = Object.freeze({
  authDescriptorRegistrationToGtv,
  mapAuthDescriptors,
});
