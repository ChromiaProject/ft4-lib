import { SignatureProvider } from "postchain-client";
import { LegacyAccount, User } from "../../client/lib/ft4/accounts/types";
import { ftUserSession } from "../../client/lib/ft4/types";
import { createLocalStorageSignatureProvider } from "../../client/lib/ft4/utils/local-signature-provider";
import SSO from "../../client/lib/ft4/utils/sso";
import { Buffer } from "buffer";

export default class FakeSSO extends SSO {
  accountId: Buffer;
  signatureProvider: SignatureProvider;

  constructor(
    readonly session: ftUserSession,
    signatureProvider: SignatureProvider | null = createLocalStorageSignatureProvider()
  ) {
    super(
      session,
      signatureProvider
        ? signatureProvider
        : createLocalStorageSignatureProvider()
    );
    // if it's explicitly null it will not act as if login has been initiated (sso.test.ts: "should throw an error if key pair cannot be found")
    if (signatureProvider) this.tmpSigProv = signatureProvider;
  }

  async autoLogin(): Promise<[LegacyAccount, User]> {
    return super.autoLogin();
  }

  async finalizeLogin(tx: string): Promise<[LegacyAccount, User]> {
    return super.finalizeLogin(tx);
  }
}
