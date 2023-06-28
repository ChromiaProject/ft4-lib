import { Operation, encryption, gtx } from "postchain-client";
import {
  authDescriptor,
  FlagsType,
} from "../../client/lib/ft3/account/auth-descriptor";
import { User } from "../../client/lib/ft3/account/types";
import { AuthData, KeyManager } from "../../client/lib/ft3/account/auth/types";
import { Buffer } from "buffer";

export default function adminUser(): User {
  const km = {
    flags: new Set([FlagsType.Account, FlagsType.Transfer]),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    authorize: (operation: Operation, auth_data: AuthData) =>
      Promise.resolve([operation]),
  };
  const signatureProvider = {
    ...gtx.newSignatureProvider(
      encryption.makeKeyPair(
        process.env.TEST_ADMIN_1_PRIV ||
          "00CED79962D1150BF844CACB76310D4746C4426558A7FD9C827B30203DACC4CE"
      )
    ),
    ...km,
  };
  const keymanager: KeyManager = {
    ...km,
    pubKey: Buffer.from(
      "036CED8CC605AD61F95A79CCCB5A5C8CCB734A106FD67D54809A69C4BEB5103F28",
      "hex"
    ),
    sign: (gtx: Buffer) => Promise.resolve(gtx),
  };
  const singleSigAuthDescriptor = authDescriptor.create.singleSig.withArgs(
    [FlagsType.Account, FlagsType.Transfer],
    signatureProvider.pubKey
  ).andNoRules;
  return {
    signatureProvider,
    keyManagers: [keymanager],
    authDescriptor: singleSigAuthDescriptor,
  };
}
