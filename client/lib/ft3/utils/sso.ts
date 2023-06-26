import {
  Itransaction,
  SignatureProvider,
} from "postchain-client/built/src/gtx/interfaces";
import { RellOperation } from "postchain-client/built/src/gtx/types";
import { authDescriptor, FlagsType } from "../account/auth-descriptor";
import { Account, User } from "../account/types";
import { ftUserSession } from "../types";
import { localStorageSignatureProvider } from "./local-signature-provider";
import { Buffer } from "buffer";

let vaultUrl = "https://vault-testnet.chromia.com";

const Operations = {
  register: "ft4.admin.register_account",
  addAuthDescriptor: "ft4.add_auth_descriptor",
};

function assert(condition: boolean, error: string) {
  if (!condition) {
    throw new SSOError(error);
  }
}

function getAccountId(transaction: Itransaction): Buffer {
  const operations = transaction.gtx.operations;
  if (operations.length === 1) {
    return Buffer.from(<string>operations[0].args[0], "hex");
  } else if (operations.length === 2) {
    return Buffer.from(<string>operations[1].args[0], "hex");
  } else {
    throw new SSOError("Invalid sso transaction");
  }
}

function validateRegisterAccountOperation(operation: RellOperation) {
  assert(
    operation.opName === Operations.register,
    `Expected '${Operations.register}', found '${operation.opName}'`
  );
}

function validateAddAuthDescriptorOperation(operation: RellOperation) {
  assert(
    operation.opName === Operations.addAuthDescriptor,
    `Expected '${Operations.addAuthDescriptor}', found '${operation.opName}'`
  );
}

function validateTransaction(transaction: Itransaction) {
  const operations = transaction.gtx.operations;
  if (operations.length === 1) {
    validateAddAuthDescriptorOperation(operations[0]);
  } else if (operations.length === 2) {
    validateRegisterAccountOperation(operations[0]);
    validateAddAuthDescriptorOperation(operations[1]);
  } else {
    throw new SSOError(
      `Invalid operation count. Found ${operations.length} operations in sso transaction`
    );
  }
}

export default class SSO {
  accountId: Buffer;
  protected tmpSigProv: SignatureProvider;
  signatureProvider: SignatureProvider;
  brid: string;

  constructor(
    readonly session: ftUserSession,
    signatureProvider = localStorageSignatureProvider.create()
  ) {
    this.signatureProvider = signatureProvider;
    //|| workaround, gtxclient doesn't expose brid but nothing needs it ||
    //vv    besides this, and sso needs to be thrown away soon anyway   vv
    this.brid = session.get.gtxClient
      .newTransaction([])
      .gtx.blockchainRID.toString("hex");
  }

  static get vaultUrl(): string {
    return vaultUrl;
  }

  static set vaultUrl(value: string) {
    vaultUrl = value;
  }

  private clear() {
    localStorageSignatureProvider.clear();
    this.tmpSigProv = undefined;
    this.signatureProvider = undefined;
    this.accountId = undefined;
  }

  private async getAccountAndUserByStoredIds(): Promise<[Account, User]> {
    if (!this.signatureProvider || !this.accountId) {
      return [null, null];
    }

    const authDesc = authDescriptor.create.singleSig.withArgs(
      [FlagsType.Transfer],
      this.signatureProvider.pubKey
    ).andNoRules;

    const user: User = {
      signatureProvider: this.signatureProvider,
      authDescriptor: authDesc,
      keyManagers: [],
    };

    const account = await this.session.get.account.by.id(this.accountId);

    if (!account || !user) {
      return [null, null];
    }

    return [account, user];
  }

  async autoLogin(): Promise<[Account, User]> {
    const [account, user] = await this.getAccountAndUserByStoredIds();

    if (!account || !user) {
      return [null, null];
    }

    const isAuthDescriptorValid =
      await this.session.get.account.isAuthDescriptorValid(
        account.id,
        user.authDescriptor.id
      );

    if (!isAuthDescriptorValid) {
      return [null, null];
    }

    return [account, user];
  }

  initiateLogin(successUrl: string, cancelUrl: string) {
    this.clear();

    this.tmpSigProv = localStorageSignatureProvider.create();

    window.location.href = `${vaultUrl}/?route=/authorize&dappId=${
      this.brid
    }&pubkey=${this.tmpSigProv.pubKey.toString(
      "hex"
    )}&successAction=${encodeURIComponent(
      successUrl
    )}&cancelAction=${encodeURIComponent(cancelUrl)}&version=0.1`;
  }

  async finalizeLogin(tx: string): Promise<[Account, User]> {
    const sigProv = this.tmpSigProv;
    this.tmpSigProv = undefined;

    if (!sigProv) {
      throw new SSOError("Error loading public key");
    }

    this.signatureProvider = sigProv;

    const authDesc = authDescriptor.create.singleSig.withArgs(
      [FlagsType.Transfer],
      sigProv.pubKey
    ).andNoRules;

    const user: User = {
      signatureProvider: sigProv,
      authDescriptor: authDesc,
      keyManagers: [],
    };

    const transaction =
      this.session.get.gtxClient.transactionFromRawTransaction(
        Buffer.from(tx, "hex")
      );
    await transaction.sign(sigProv);

    validateTransaction(transaction);

    await transaction.postAndWaitConfirmation();

    const accountId = getAccountId(transaction);

    this.accountId = accountId;

    const account = await this.session.get.account.by.id(accountId);

    return [account, user];
  }

  async logout(): Promise<void> {
    const [account, user] = await this.getAccountAndUserByStoredIds();

    if (account && user) {
      await this.session.account.authDescriptor.delete(
        user.authDescriptor.id,
        account.id
      );
    }

    this.clear();
  }
}

export class SSOError extends Error {
  constructor(msg?) {
    super(msg);
    this.message = msg;
    this.name = "SSOError";
  }
}
