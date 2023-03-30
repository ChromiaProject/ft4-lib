import { newSignatureProvider } from "postchain-client/built/src/gtx/gtx";
import {
  authDescriptor,
  FlagsType,
} from "../../client/lib/ft3/account/auth-descriptor";
import { AuthDescriptorRule } from "../../client/lib/ft3/account/auth-descriptor/types";
import { User } from "../../client/lib/ft3/account/types";

export default function singleSigUser(
  rule: AuthDescriptorRule | null = null
): User {
  const signatureProvider = newSignatureProvider(null);
  const singleSigAuthDescriptor = authDescriptor.create.singleSig
    .withArgs([FlagsType.Account, FlagsType.Transfer], signatureProvider.pubKey)
    .andRules(rule);
  return { signatureProvider, authDescriptor: singleSigAuthDescriptor };
}
