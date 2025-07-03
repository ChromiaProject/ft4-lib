import {
  AuthDescriptor,
  AuthDescriptorRules,
  AuthFlag,
  createSingleSigAuthDescriptorRegistration,
  deriveAuthDescriptorId,
  SingleSig,
} from "@ft4/accounts";
import { createInMemoryFtKeyStore, FtKeyStore } from "@ft4/authentication";
import {
  encryption,
  gtv,
  gtx,
  KeyPair,
  MERKLE_HASH_VERSIONS,
  SignatureProvider,
} from "postchain-client";

export const FT4_USER_TYPE = "FT4_USER";

export function singleSigUser(rule: AuthDescriptorRules | null = null): User {
  return newSingleSigUser(encryption.makeKeyPair(), rule);
}

export function newSingleSigUser(
  keyPair: KeyPair,
  rule: AuthDescriptorRules | null = null,
): User {
  const signatureProvider = gtx.newSignatureProvider(
    MERKLE_HASH_VERSIONS.ONE,
    keyPair,
  );
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
      accountId: gtv.gtvHash(keyPair.pubKey, MERKLE_HASH_VERSIONS.ONE),
      accountType: FT4_USER_TYPE,
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
