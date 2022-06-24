import { FlagsType } from "../../client/lib/ft3/user/account";
import KeyPair from "../../client/lib/cyptoUtils/keyPair";
import User from "../../client/lib/ft3/user/user";
import SingleSignatureAuthDescriptor from "../../client/lib/ft3/user/auth-descriptor/single-signature-auth-descriptor";
import AuthDescriptorRule from "../../client/lib/ft3/user/auth-descriptor/auth-descriptor-rule";

class TestUser {
  static singleSig(rule: AuthDescriptorRule | null = null) {
    const keyPair = new KeyPair();
    const singleSigAuthDescriptor = new SingleSignatureAuthDescriptor(
      keyPair.pubKey,
      [FlagsType.Account, FlagsType.Transfer],
      rule
    );
    return new User(keyPair, singleSigAuthDescriptor);
  }
}

export default TestUser;
