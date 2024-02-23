import { Buffer } from "buffer";
import {
  encryption,
  getDigestToSignFromRawGtxBody,
  gtx,
  KeyPair,
  Operation,
  RawGtxBody,
  SignatureProvider,
} from "postchain-client";
import {
  AuthDescriptorRules,
  createSingleSigAuthDescriptorRegistration,
  deriveAuthDescriptorId,
  FlagsType,
  SingleSig,
} from "@ft4/accounts/auth-descriptor";
import { AuthDescriptor } from "@ft4/accounts/auth-descriptor/types";
import { KeyManager } from "@ft4/accounts/auth/types";
import { createInMemoryFtKeyStore, FtKeyStore } from "@ft4/authentication";

export default function singleSigUser(
  rule: AuthDescriptorRules | null = null,
): User {
  return newSingleSigUser(encryption.makeKeyPair(), rule);
}

export function newSingleSigUser(
  keyPair: KeyPair,
  rule: AuthDescriptorRules | null = null,
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
    sign: (gtx: RawGtxBody) =>
      Promise.resolve(getDigestToSignFromRawGtxBody(gtx)),
  };
  const singleSigAuthDescriptor = createSingleSigAuthDescriptorRegistration(
    [FlagsType.Account, FlagsType.Transfer],
    signatureProvider.pubKey,
    rule,
  );
  return {
    signatureProvider,
    keyManagers: [keymanager],
    authDescriptor: {
      ...singleSigAuthDescriptor,
      id: deriveAuthDescriptorId(singleSigAuthDescriptor),
      accountId: deriveAuthDescriptorId(singleSigAuthDescriptor),
      created: new Date(),
    },
    keyStore: createInMemoryFtKeyStore(keyPair),
  };
}

export type User = {
  signatureProvider: SignatureProvider;
  keyManagers: KeyManager[];
  authDescriptor: AuthDescriptor<SingleSig>;
  keyStore: FtKeyStore;
};
