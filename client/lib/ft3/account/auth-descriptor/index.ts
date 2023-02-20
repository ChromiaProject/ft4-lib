import { AuthDescriptor } from "./types";
import { create } from "./auth-descriptor";
import { allow } from "./rules";
import { gtvHash } from "postchain-client/built/src/gtv";

export enum AuthType {
  single_sig = "S",
  multi_sig = "M",
}

export enum FlagsType {
  Account = "A", // Change Account settings
  Transfer = "T", // Transfer balance
}

function hashAuthDescriptor(ad: AuthDescriptor) {
  return gtvHash(ad);
}

function getAuthDescriptorId(ad: AuthDescriptor): Buffer {
  return gtvHash(ad);
}

function getAuthDescriptorSigners(ad: AuthDescriptor): Buffer[] {
  const args = ad[1];
  let signers: Buffer[];
  if (args.length === 2) {
    signers = [args[1]];
  } else if (args.length === 3) {
    signers = args[2];
  }
  return signers;
}

export const authDescriptor = {
  create,
  allow,
  getSigners: getAuthDescriptorSigners,
  getId: getAuthDescriptorId,
  hash: hashAuthDescriptor,
};
