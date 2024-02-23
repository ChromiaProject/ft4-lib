import {
  Operation,
  encryption,
  gtx,
  RawGtxBody,
  getDigestToSignFromRawGtxBody,
} from "postchain-client";
import { KeyManager } from "@ft4/accounts/auth/types";
import { Buffer } from "buffer";
import { User } from "./test-user";
import {
  FlagsType,
  createSingleSigAuthDescriptorRegistration,
} from "@ft4/accounts/auth-descriptor";
import { testAdFromRegistration } from "./util";
import { createInMemoryFtKeyStore } from "@ft4/authentication";

export default function adminUser(): User {
  const km = {
    flags: new Set([FlagsType.Account, FlagsType.Transfer]),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    authorize: (operation: Operation) => Promise.resolve([operation]),
  };

  const keyPair = encryption.makeKeyPair(
    process.env.TEST_ADMIN_1_PRIV ||
      "00CED79962D1150BF844CACB76310D4746C4426558A7FD9C827B30203DACC4CE",
  );

  const signatureProvider = {
    ...gtx.newSignatureProvider(keyPair),
    ...km,
  };
  const keymanager: KeyManager = {
    ...km,
    pubKey: Buffer.from(
      "036CED8CC605AD61F95A79CCCB5A5C8CCB734A106FD67D54809A69C4BEB5103F28",
      "hex",
    ),
    sign: (txBody: RawGtxBody) =>
      Promise.resolve(getDigestToSignFromRawGtxBody(txBody)),
  };
  const singleSigAuthDescriptor = createSingleSigAuthDescriptorRegistration(
    [FlagsType.Account, FlagsType.Transfer],
    signatureProvider.pubKey,
    null,
  );
  return {
    signatureProvider,
    keyManagers: [keymanager],
    authDescriptor: testAdFromRegistration(singleSigAuthDescriptor),
    keyStore: createInMemoryFtKeyStore(keyPair),
  };
}

export const adminKeyPair = encryption.makeKeyPair(
  process.env.TEST_ADMIN_1_PRIV ||
    "00CED79962D1150BF844CACB76310D4746C4426558A7FD9C827B30203DACC4CE",
);
