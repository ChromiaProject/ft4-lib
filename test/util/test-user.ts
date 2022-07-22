import { FlagsType } from "../../client/lib/ft3/user/account-utils";
import { InMemorySignatureProvider } from "../../client/lib/ft3/user/signature-provider";
import User from "../../client/lib/ft3/user/user";
import SingleSignatureAuthDescriptor from "../../client/lib/ft3/user/auth-descriptor/single-signature-auth-descriptor";
import AuthDescriptorRule from "../../client/lib/ft3/user/auth-descriptor/auth-descriptor-rule";

class TestUser {
  static singleSig(rule: AuthDescriptorRule | null = null) {
    const signatureProvider = new InMemorySignatureProvider();
    const singleSigAuthDescriptor = new SingleSignatureAuthDescriptor(
      signatureProvider.pubKey,
      [FlagsType.Account, FlagsType.Transfer],
      rule
    );
    return new User(signatureProvider, singleSigAuthDescriptor);
  }
}

export default TestUser;
