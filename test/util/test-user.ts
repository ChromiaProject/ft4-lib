import {
  AuthDescriptor,
  AuthDescriptorRules,
  AuthFlag,
  createSingleSigAuthDescriptorRegistration,
  deriveAuthDescriptorId,
  SingleSig,
} from "@ft4/accounts";
import { createInMemoryFtKeyStore, FtKeyStore } from "@ft4/authentication";
import { getMerkleHashVersion, MerkleHashVersionSource } from "@ft4/utils";
import {
  encryption,
  gtv,
  gtx,
  KeyPair,
  SignatureProvider,
} from "postchain-client";

export const FT4_USER_TYPE = "FT4_USER";

export function singleSigUser(
  merkleHashVersionSource: MerkleHashVersionSource,
  rule: AuthDescriptorRules | null = null,
): User {
  return newSingleSigUser(
    encryption.makeKeyPair(),
    merkleHashVersionSource,
    rule,
  );
}

export function newSingleSigUser(
  keyPair: KeyPair,
  merkleHashVersionSource: MerkleHashVersionSource,
  rule: AuthDescriptorRules | null = null,
): User {
  const merkleHashVersion = getMerkleHashVersion(merkleHashVersionSource);
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
      id: deriveAuthDescriptorId(singleSigAuthDescriptor, merkleHashVersion),
      accountId: gtv.gtvHash(keyPair.pubKey, merkleHashVersion),
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
