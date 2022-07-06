import { FlagsType } from "../../client/lib/ft3/user/account";
import { BasicSignatureProvider } from "../../client/lib/ft3/user/signature-provider";
import User from "../../client/lib/ft3/user/user";
import SingleSignatureAuthDescriptor from "../../client/lib/ft3/user/auth-descriptor/single-signature-auth-descriptor";
import AuthDescriptorRule from "../../client/lib/ft3/user/auth-descriptor/auth-descriptor-rule";

class TestUser {
  static singleSig(rule: AuthDescriptorRule | null = null) {
    const sigProv = new BasicSignatureProvider();
    const singleSigAuthDescriptor = new SingleSignatureAuthDescriptor(
      sigProv.pubKey,
      [FlagsType.Account, FlagsType.Transfer],
      rule
    );
    return new User(sigProv, singleSigAuthDescriptor);
  }
}

export default TestUser;
