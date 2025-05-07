import { gtv, MERKLE_HASH_VERSIONS } from "postchain-client";
import { authDescriptorRegistrationToGtv } from "./gtv";
import { AuthDescriptorRules } from "./rules";
import {
  isRawAnyAuthDescriptorRegistration,
  isSingleSigArgs,
} from "./type-predicates";
import {
  AnyAuthDescriptor,
  AnyAuthDescriptorRegistration,
  AuthDescriptorRegistration,
  AuthType,
  MultiSig,
  RawAnyAuthDescriptorRegistration,
  SingleSig,
} from "./types";

function hashAuthDescriptor(ad: RawAnyAuthDescriptorRegistration) {
  return gtv.gtvHash(ad, MERKLE_HASH_VERSIONS.ONE);
}

/**
 * Computes the resulting auth descriptor id for the data
 * in an auth descriptor registration.
 * @param authDescriptor - registration to compute id for
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
 * @param flags - the flags that this auth descriptor will have
 * @param signer - the signer that will sign this auth descriptor
 * @param rules - any rules to be included in the registration
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
 * @param flags - the flags that this auth descriptor will have
 * @param signers - the signers that will sign this auth descriptor
 * @param signaturesRequired - how many signatures is required to perform an operation
 * @param rules - any rules to be included in the registration
 * @returns the created registration
 */
export function createMultiSigAuthDescriptorRegistration(
  flags: string[],
  signers: Buffer[],
  signaturesRequired: number,
  rules: AuthDescriptorRules | null = null,
): AuthDescriptorRegistration<MultiSig> {
  return {
    authType: AuthType.MultiSig,
    args: { flags, signers, signaturesRequired },
    rules,
  };
}

/**
 * Utility method that accepts an array of any kind of auth descriptor/auth descriptor registration
 * and returns an array of all of the signers represented by the provided objects.
 * @param authDescriptors - the auth descriptors(registrations) over which to aggregate signers
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
