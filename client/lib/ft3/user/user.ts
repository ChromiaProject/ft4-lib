import { util } from "postchain-client";
import { AuthDescriptor, FlagsType } from "./account";
import KeyPair from "../../cyptoUtils/keyPair";
import SingleSignatureAuthDescriptor from "./auth-descriptor/single-signature-auth-descriptor";

export default class User {
  keyPair: KeyPair;
  authDescriptor: AuthDescriptor;

  constructor(keyPair: KeyPair, authDescriptor: AuthDescriptor) {
    this.keyPair = keyPair;
    this.authDescriptor = authDescriptor;
  }

  static generateSingleSigUser(
    flags: FlagsType[] = [FlagsType.Account, FlagsType.Transfer]
  ): User {
    const keyPair = util.makeKeyPair();
    return new User(
      keyPair,
      new SingleSignatureAuthDescriptor(keyPair.pubKey, flags)
    );
  }
}
