import { Buffer } from "buffer";
import {
  encryption,
  gtx,
  KeyPair,
  Operation,
  SignatureProvider,
} from "postchain-client";
import { KeyManager } from "/ft4/accounts/auth/types";
import {
  AuthDescriptorRegistration,
  AuthDescriptorRule,
  FlagsType,
  SingleSigAuthDescriptorArgs,
  createSingleSignatureAuthDescriptorRegistration,
} from "/ft4/accounts/auth-descriptor";
import { ComplexAuthDescriptorRule } from "/ft4/accounts/auth-descriptor/types";

export default function singleSigUser(
  rule: AuthDescriptorRule | ComplexAuthDescriptorRule | null = null,
): User {
  return newSingleSigUser(encryption.makeKeyPair(), rule);
}

export function newSingleSigUser(
  keyPair: KeyPair,
  rule: AuthDescriptorRule | ComplexAuthDescriptorRule | null = null,
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
      "hex",
    ),
    sign: (gtx: Buffer) => Promise.resolve(gtx),
  };
  const singleSigAuthDescriptor =
    createSingleSignatureAuthDescriptorRegistration(
      {
        flags: [FlagsType.Account, FlagsType.Transfer],
        signer: signatureProvider.pubKey,
      },
      rule,
    );
  return {
    signatureProvider,
    keyManagers: [keymanager],
    authDescriptorRegistration: singleSigAuthDescriptor,
  };
}

export type User = {
  signatureProvider: SignatureProvider;
  keyManagers: KeyManager[];
  authDescriptorRegistration: AuthDescriptorRegistration<SingleSigAuthDescriptorArgs>;
};
