import {
  User,
  FlagsType,
  SingleSignatureAuthDescriptor,
} from "../../client/lib/ft3";
import KeyPair from "../../client/lib/cyptoUtils/keyPair";
import SignatureProvider, {
  BasicSignatureProvider,
} from "../../client/lib/ft3/user/signature-provider";

export default class AdminKeyPair {
  private static keyPair: KeyPair = null;
  private static user: User = null;

  static change(privKey: string) {
    this.keyPair = new KeyPair(privKey);
  }

  private AdminKeyPair() {} /*eslint: needed? if yes: */ //eslint-disable-line @typescript-eslint/no-empty-function

  private static initialize() {
    if (this.keyPair == null) {
      this.keyPair = new KeyPair(
        process.env.TEST_ADMIN_1_PRIV ||
          "00CED79962D1150BF844CACB76310D4746C4426558A7FD9C827B30203DACC4CE"
      );
    }
  }

  private static initializeUser() {
    if (this.user == null) {
      if (this.keyPair == null) this.initialize();
      const authDescr = new SingleSignatureAuthDescriptor(this.keyPair.pubKey, [
        FlagsType.Account,
        FlagsType.Transfer,
      ]);
      const sigProv = new BasicSignatureProvider(this.keyPair.privKey);
      this.user = new User(sigProv, authDescr);
    }
  }

  static get(): SignatureProvider {
    if (this.user == null) this.initialize();
    return new BasicSignatureProvider(this.keyPair.privKey);
  }

  static getAsUser(): User {
    if (this.user == null) this.initializeUser();
    return this.user;
  }
}
