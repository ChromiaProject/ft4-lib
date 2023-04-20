import { encryption, gtx } from "postchain-client";
import {
  authDescriptor,
  FlagsType,
} from "../../client/lib/ft3/account/auth-descriptor";
import { User } from "../../client/lib/ft3/account/types";

export default function adminUser(): User {
  const signatureProvider = gtx.newSignatureProvider(
    encryption.makeKeyPair(
      process.env.TEST_ADMIN_1_PRIV ||
        "00CED79962D1150BF844CACB76310D4746C4426558A7FD9C827B30203DACC4CE"
    )
  );
  const singleSigAuthDescriptor = authDescriptor.create.singleSig.withArgs(
    [FlagsType.Account, FlagsType.Transfer],
    signatureProvider.pubKey
  ).andNoRules;
  return { signatureProvider, authDescriptor: singleSigAuthDescriptor };
}
