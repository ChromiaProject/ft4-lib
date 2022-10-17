import {
  FlagsType,
  InMemorySignatureProvider,
  User,
  SingleSignatureAuthDescriptor,
} from "../../client/lib/ft3";
import AuthDescriptorRule from "../../client/lib/ft3/user/auth-descriptor/auth-descriptor-rule";

class TestUser {
  static singleSig(rule: AuthDescriptorRule | null = null) {
    const sigProv = new InMemorySignatureProvider();
    const singleSigAuthDescriptor = new SingleSignatureAuthDescriptor(
      sigProv.pubKey,
      [FlagsType.Account, FlagsType.Transfer],
      rule
    );
    return new User(sigProv, singleSigAuthDescriptor);
  }
}

export default TestUser;
