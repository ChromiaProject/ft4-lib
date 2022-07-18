import { AuthDescriptor } from "./account";
import SignatureProvider from "./signature-provider";

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
}
