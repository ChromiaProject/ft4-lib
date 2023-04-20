import { AuthDescriptor, GtvAuthDescriptor } from "./types";
import { create } from "./auth-descriptor";
import { allow } from "./rules";
import { gtv } from "postchain-client";

export enum AuthType {
  single_sig = "S",
  multi_sig = "M",
}

export enum FlagsType {
  Account = "A", // Change Account settings
  Transfer = "T", // Transfer balance
}

export function hashAuthDescriptor(ad: GtvAuthDescriptor) {
  return gtv.gtvHash(ad);
}

export function getAuthDescriptorId(ad: GtvAuthDescriptor): Buffer {
  return hashAuthDescriptor(ad);
}

export function deriveAccountId(
  firstAuthDescriptor: GtvAuthDescriptor
): Buffer {
  return hashAuthDescriptor(firstAuthDescriptor);
}

export function getAuthDescriptorSigners(ad: GtvAuthDescriptor): Buffer[] {
  const args = ad[1];
  let signers: Buffer[];
  if (args.length === 2) {
    signers = [args[1]];
  } else if (args.length === 3) {
    signers = args[2];
  }
  return signers;
}

export function fromGtv(ad: GtvAuthDescriptor): AuthDescriptor {
  return {
    id: getAuthDescriptorId(ad),
    authType: ad[0],
    flags: new Set(ad[1][0]),
    signaturesRequired: ad[0] === "S" ? 1 : (ad[1][1] as number),
    signers: ad[0] === "S" ? [ad[1][1] as Buffer] : ad[1][2],
    rule: ad[2],
  };
}

export function toGtv(ad: AuthDescriptor): GtvAuthDescriptor {
  return ad.authType === "S" ? createSingleSigAd(ad) : createMultiSigAd(ad);
}

function createSingleSigAd(ad: AuthDescriptor): GtvAuthDescriptor {
  return [ad.authType, [[...ad.flags], ad.signers[0]], ad.rule];
}

function createMultiSigAd(ad: AuthDescriptor): GtvAuthDescriptor {
  return [
    ad.authType,
    [[...ad.flags], ad.signaturesRequired, ad.signers],
    ad.rule,
  ];
}

export const authDescriptor = {
  create,
  allow,
  fromGtv,
  toGtv,
  getSigners: getAuthDescriptorSigners,
  getId: getAuthDescriptorId,
  deriveAccountId,
  hash: hashAuthDescriptor,
};
