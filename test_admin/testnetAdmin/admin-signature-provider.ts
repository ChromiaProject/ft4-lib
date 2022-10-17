import {
  User,
  FlagsType,
  SingleSignatureAuthDescriptor,
  InMemorySignatureProvider,
  SignatureProvider,
} from "../../client/lib/ft3";

export default class AdminSignatureProvider {
  private static sigProv: SignatureProvider;
  private static user: User;

  static change(privKey: string) {
    this.sigProv = new InMemorySignatureProvider(privKey);
  }

  private static initialize() {
    if (this.sigProv == null) {
      this.sigProv = new InMemorySignatureProvider(
        process.env.TEST_ADMIN_1_PRIV ||
          "00CED79962D1150BF844CACB76310D4746C4426558A7FD9C827B30203DACC4CE"
      );
    }
  }

  private static initializeUser() {
    if (this.user == null) {
      if (this.sigProv == null) this.initialize();
      const authDescr = new SingleSignatureAuthDescriptor(this.sigProv.pubKey, [
        FlagsType.Account,
        FlagsType.Transfer,
      ]);
      this.user = new User(this.sigProv, authDescr);
    }
  }

  static get(): SignatureProvider {
    if (this.user == null) this.initialize();
    return this.sigProv;
  }

  static getAsUser(): User {
    if (this.user == null) this.initializeUser();
    return this.user;
  }
}
