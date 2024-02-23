import { encryption, gtx } from "postchain-client";
import { User } from "./test-user";
import {
  FlagsType,
  createSingleSigAuthDescriptorRegistration,
} from "@ft4/accounts/auth-descriptor";
import { testAdFromRegistration } from "./util";
import { createInMemoryFtKeyStore } from "@ft4/authentication";

export default function adminUser(): User {
  const keyPair = encryption.makeKeyPair(
    process.env.TEST_ADMIN_1_PRIV ||
      "00CED79962D1150BF844CACB76310D4746C4426558A7FD9C827B30203DACC4CE",
  );

  const signatureProvider = gtx.newSignatureProvider(keyPair);
  const singleSigAuthDescriptor = createSingleSigAuthDescriptorRegistration(
    [FlagsType.Account, FlagsType.Transfer],
    signatureProvider.pubKey,
    null,
  );
  return {
    signatureProvider,
    authDescriptor: testAdFromRegistration(singleSigAuthDescriptor),
    keyStore: createInMemoryFtKeyStore(keyPair),
  };
}

export const adminKeyPair = encryption.makeKeyPair(
  process.env.TEST_ADMIN_1_PRIV ||
    "00CED79962D1150BF844CACB76310D4746C4426558A7FD9C827B30203DACC4CE",
);
