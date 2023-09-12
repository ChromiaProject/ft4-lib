import {
  AuthDescriptor,
  AuthDescriptorResponse,
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

export function hashAuthDescriptor(ad: RawAuthDescriptor) {
  return gtv.gtvHash(ad);
}

export function getAuthDescriptorId(ad: RawAuthDescriptor): Buffer {
  return hashAuthDescriptor(ad);
}

export function deriveAccountId(
  firstAuthDescriptor: RawAuthDescriptor
): Buffer {
  return hashAuthDescriptor(firstAuthDescriptor);
}

export function getAuthDescriptorSigners(ad: GtvAuthDescriptor): Buffer[] {
  const args = ad[2];
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
  const authType = deserializeAuthType(ad[1]);
  return {
    id: ad[0],
    authType,
    flags: new Set(ad[2][0]),
    signaturesRequired: authType === "S" ? 1 : (ad[2][1] as number),
    signers: (authType === "S" ? [ad[2][1] as Buffer] : ad[2][2]) || [],
    rule: ad[3]!,
    created: ad[4],
  };
}

export function toGtv(ad: AuthDescriptor): GtvAuthDescriptor {
  return ad.authType === AuthType.single_sig
    ? createSingleSigAd(ad)
    : createMultiSigAd(ad);
}

function createSingleSigAd(ad: AuthDescriptor): GtvAuthDescriptor {
  return [
    ad.id,
    serializeAuthType(ad.authType as AuthType),
    [[...ad.flags], ad.signers[0]],
    ad.rule,
    ad.created,
  ];
}

function createMultiSigAd(ad: AuthDescriptor): GtvAuthDescriptor {
  return [
    ad.id,
    serializeAuthType(ad.authType as AuthType),
    [[...ad.flags], ad.signaturesRequired, ad.signers],
    ad.rule,
    ad.created,
  ];
}

export function mapAuthDescriptor(raw: AuthDescriptorResponse): AuthDescriptor {
  const { id, auth_type, args, rules, created } = raw;
  return Object.freeze(
    fromGtv([
      id,
      serializeAuthType(auth_type as AuthType),
      args,
      rules,
      created,
    ] as GtvAuthDescriptor)
  );
}

export function mapAuthDescriptors(
  raw: AuthDescriptorResponse[]
): AuthDescriptor[] {
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
