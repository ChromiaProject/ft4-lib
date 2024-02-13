import { Buffer } from "buffer";
import { gtv as pclGtv } from "postchain-client";
import {
  authDescriptorRegistrationToGtv,
  mapAuthDescriptorsFromGtv,
  authDescriptorFromGtv,
} from "./gtv";
import {
  AnyAuthDescriptor,
  AnyAuthDescriptorRegistration,
  AuthDescriptor,
  AuthDescriptorError,
  AuthDescriptorRegistration,
  AuthType,
  FlagsType,
  RawAnyAuthDescriptor,
  RawAuthDescriptorRegistration,
  MultiSig,
  SingleSig,
  RawAnyAuthDescriptorRegistration,
} from "./types";
import {
  isRawAnyAuthDescriptorRegistration,
  isSingleSigArgs,
} from "./type-predicates";
import {
  AuthDescriptorRules,
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
import {
  createAuthDescriptorValidator,
  AuthDescriptorValidator,
} from "./validator";

function hashAuthDescriptor(ad: RawAnyAuthDescriptorRegistration) {
  return pclGtv.gtvHash(ad);
}

/**
 * Computes the resulting auth descriptor id for the data
 * in an auth descriptor registration.
 * @param authDescriptor registration to compute id for
 * @returns auth descriptor id as Buffer
 */
export function deriveAuthDescriptorId(
  authDescriptor:
    | RawAnyAuthDescriptorRegistration
    | AnyAuthDescriptorRegistration,
): Buffer {
  const ad = isRawAnyAuthDescriptorRegistration(authDescriptor)
    ? authDescriptor
    : authDescriptorRegistrationToGtv(authDescriptor);
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
  rules: AuthDescriptorRules | null = null,
): AuthDescriptorRegistration<SingleSig> {
  return {
    authType: AuthType.SingleSig,
    args: { flags, signer },
    rules,
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
  rules: AuthDescriptorRules | null,
): AuthDescriptorRegistration<MultiSig> {
  return {
    authType: AuthType.MultiSig,
    args: { flags, signers, signaturesRequired },
    rules,
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
  RawAnyAuthDescriptor,
  RawAuthDescriptorRegistration,
  FlagsType,
  SingleSig,
  MultiSig,
  AuthType,
  AuthDescriptor,
  AuthDescriptorError,
  AuthDescriptorRules,
  AuthDescriptorRegistration,
  AnyAuthDescriptorRegistration,
  blockHeight,
  blockTime,
  opCount,
  lessThan,
  lessOrEqual,
  equals,
  greaterThan,
  greaterOrEqual,
  and,
  createAuthDescriptorValidator,
  AuthDescriptorValidator,
};

export const gtv = Object.freeze({
  authDescriptorRegistrationToGtv,
  authDescriptorFromGtv,
  mapAuthDescriptorsFromGtv,
});
