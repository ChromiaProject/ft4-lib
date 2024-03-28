import {
  AuthDescriptor,
  AuthDescriptorRules,
  AuthFlag,
  createSingleSigAuthDescriptorRegistration,
  deriveAuthDescriptorId,
  SingleSig,
} from "@ft4/accounts";
import { createInMemoryFtKeyStore, FtKeyStore } from "@ft4/authentication";
import { encryption, gtx, KeyPair, SignatureProvider } from "postchain-client";

export function singleSigUser(
  rule: AuthDescriptorRules | null = null,
): User {
  return newSingleSigUser(encryption.makeKeyPair(), rule);
}

export function newSingleSigUser(
  keyPair: KeyPair,
  rule: AuthDescriptorRules | null = null,
): User {
  const signatureProvider = gtx.newSignatureProvider(keyPair);
  const singleSigAuthDescriptor = createSingleSigAuthDescriptorRegistration(
    [AuthFlag.Account, AuthFlag.Transfer],
    signatureProvider.pubKey,
    rule,
  );
  return {
    signatureProvider,
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
  authDescriptor: AuthDescriptor<SingleSig>;
  keyStore: FtKeyStore;
};
