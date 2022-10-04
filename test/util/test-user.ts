import {
  FlagsType,
  InMemorySignatureProvider,
  User,
  SingleSignatureAuthDescriptor,
} from "../../client/lib/ft3";
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
