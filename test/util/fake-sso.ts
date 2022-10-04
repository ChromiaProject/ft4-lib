import {
  SSO,
  MutableAccount,
  Blockchain,
  User,
  LocalStorageSignatureProvider,
} from "../../client/lib/ft3";

export default class FakeSSO extends SSO {
  accountId: Buffer;
  signatureProvider: LocalStorageSignatureProvider;

  constructor(
    readonly blockchain: Blockchain,
    signatureProvider: LocalStorageSignatureProvider | null = new LocalStorageSignatureProvider()
  ) {
    super(
      blockchain,
      signatureProvider
        ? signatureProvider
        : new LocalStorageSignatureProvider()
    );
    // if it's explicitly null it will not act as if login has been initiated (sso.test.ts: "should throw an error if key pair cannot be found")
    if (signatureProvider) this.tmpSigProv = signatureProvider;
  }

  async autoLogin(): Promise<[MutableAccount, User]> {
    return super.autoLogin();
  }

  async finalizeLogin(tx: string): Promise<[MutableAccount, User]> {
    return super.finalizeLogin(tx);
  }
}
