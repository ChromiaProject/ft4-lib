import {
  AuthDescriptor,
  AuthType,
  GtvAuthDescriptor,
  RawAuthDescriptor,
} from "./types";
import { create } from "./auth-descriptor";
import { allow } from "./rules";
import { gtv } from "postchain-client";
import { Buffer } from "buffer";

export * from "./types";
export * from "./auth-descriptor";

const authTypeSerializationMap = Object.values(AuthType)
  .map((value, i) => [value, i])
  .reduce((acc, curr) => ({ ...acc, [curr[0]]: curr[1] }), {});
const authTypeDeserializationMap = Object.values(AuthType)
  .map((value, i) => [i, value])
  .reduce((acc, curr) => ({ ...acc, [curr[0]]: curr[1] }), {});

export function serializeAuthType(type: AuthType): number {
  return authTypeSerializationMap[type];
}

export function deserializeAuthType(i: number): AuthType {
  return authTypeDeserializationMap[i];
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
  } else {
    signers = [];
  }

  return signers;
}

export function fromGtv(ad: GtvAuthDescriptor): AuthDescriptor {
  const authType = deserializeAuthType(ad[0]);
  return {
    id: getAuthDescriptorId(ad),
    authType,
    flags: new Set(ad[1][0]),
    signaturesRequired: authType === "S" ? 1 : (ad[1][1] as number),
    signers: (authType === "S" ? [ad[1][1] as Buffer] : ad[1][2]) || [],
    rule: ad[2]!,
  };
}

export function toGtv(ad: AuthDescriptor): GtvAuthDescriptor {
  return ad.authType === "S" ? createSingleSigAd(ad) : createMultiSigAd(ad);
}

function createSingleSigAd(ad: AuthDescriptor): GtvAuthDescriptor {
  return [
    serializeAuthType(ad.authType as AuthType),
    [[...ad.flags], ad.signers[0]],
    ad.rule,
  ];
}

function createMultiSigAd(ad: AuthDescriptor): GtvAuthDescriptor {
  return [
    serializeAuthType(ad.authType as AuthType),
    [[...ad.flags], ad.signaturesRequired, ad.signers],
    ad.rule,
  ];
}

export function mapAuthDescriptor(raw: RawAuthDescriptor): AuthDescriptor {
  const { auth_type, args, rules } = raw as RawAuthDescriptor;
  return Object.freeze(
    fromGtv([
      serializeAuthType(auth_type as AuthType),
      args,
      rules,
    ] as GtvAuthDescriptor)
  );
}

export function mapAuthDescriptors(raw: RawAuthDescriptor[]): AuthDescriptor[] {
  return raw.map(mapAuthDescriptor);
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
