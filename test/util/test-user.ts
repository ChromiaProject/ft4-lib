import { gtx, Operation, SignatureProvider } from "postchain-client";
import {
  authDescriptor,
  FlagsType,
} from "../../client/lib/ft4/accounts/auth-descriptor";
import {
  AuthDescriptor,
  AuthDescriptorRule,
} from "../../client/lib/ft4/accounts/auth-descriptor/types";
import { KeyManager } from "../../client/lib/ft4/accounts/auth/types";
import { KeyPair } from "../../client/lib/cryptoUtils";
import { Buffer } from "buffer";

export default function singleSigUser(
  rule: AuthDescriptorRule | null = null
): User {
  return newSingleSigUser(new KeyPair(), rule);
}

export function newSingleSigUser(
  keyPair: KeyPair,
  rule: AuthDescriptorRule | null = null
): User {
  const km = {
    flags: new Set([FlagsType.Account, FlagsType.Transfer]),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    authorize: (operation: Operation) => Promise.resolve([operation]),
  };
  const signatureProvider = { ...gtx.newSignatureProvider(keyPair), ...km };
  const keymanager: KeyManager = {
    ...km,
    pubKey: Buffer.from(
      "036CED8CC605AD61F95A79CCCB5A5C8CCB734A106FD67D54809A69C4BEB5103F28",
      "hex"
    ),
    sign: (gtx: Buffer) => Promise.resolve(gtx),
  };
  const singleSigAuthDescriptor = authDescriptor.create.singleSig
    .withArgs([FlagsType.Account, FlagsType.Transfer], signatureProvider.pubKey)
    .andRules(rule);
  return {
    signatureProvider,
    keyManagers: [keymanager],
    authDescriptor: singleSigAuthDescriptor,
  };
}

export type User = {
  signatureProvider: SignatureProvider;
  keyManagers: KeyManager[];
  authDescriptor: AuthDescriptor;
};
