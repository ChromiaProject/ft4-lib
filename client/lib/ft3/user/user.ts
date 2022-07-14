import { AuthDescriptor, FlagsType } from "./account";
import SignatureProvider, {
  InMemorySignatureProvider,
} from "./signature-provider";
import SingleSignatureAuthDescriptor from "./auth-descriptor/single-signature-auth-descriptor";

export default class User {
  signatureProvider: SignatureProvider;
  authDescriptor: AuthDescriptor;

  constructor(
    signatureProvider: SignatureProvider,
    authDescriptor: AuthDescriptor
  ) {
    this.signatureProvider = signatureProvider;
    this.authDescriptor = authDescriptor;
  }

  static generateSingleSigUser(
    flags: FlagsType[] = [FlagsType.Account, FlagsType.Transfer]
  ): User {
    const signatureProvider = new InMemorySignatureProvider();
    return new User(
      signatureProvider,
      new SingleSignatureAuthDescriptor(signatureProvider.pubKey, flags)
    );
  }
}
