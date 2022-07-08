import { Account, FlagsType } from "../account";
import Blockchain from "../../core/blockchain/blockchain";
import Transaction from "../../core/transaction";
import User from "../user";
import SignatureProvider, {
  BasicSignatureProvider,
} from "../signature-provider";
import SingleSignatureAuthDescriptor from "../auth-descriptor/single-signature-auth-descriptor";
import Operation from "../../core/operation";

let vaultUrl = "https://vault-testnet.chromia.com";

const Operations = {
  register: "ft3.dev_register_account",
  addAuthDescriptor: "ft3.add_auth_descriptor",
};

function assert(condition: boolean, error: string) {
  if (!condition) {
    throw new Error(error);
  }
}

function getAccountId(transaction: Transaction): Buffer {
  const operations = transaction.operations;
  if (operations.length === 1) {
    return Buffer.from(<string>operations[0].args[0], "hex");
  } else if (operations.length === 2) {
    return Buffer.from(<string>operations[1].args[0], "hex");
  } else {
    throw new Error("Invalid sso transaction");
  }
}

function validateRegisterAccountOperation(operation: Operation) {
  assert(
    operation.name === Operations.register,
    `Expected '${Operations.register}', found '${operation.name}'`
  );
}

function validateAddAuthDescriptorOperation(
  operation: Operation,
  pubKey: Buffer /*eslint: unused. is this for backwards compatibility? if yes: */ // eslint-disable-line @typescript-eslint/no-unused-vars
) {
  assert(
    operation.name === Operations.addAuthDescriptor,
    `Expected '${Operations.addAuthDescriptor}', found '${operation.name}'`
  );
}

function validateTransaction(transaction: Transaction, pubKey: Buffer) {
  const operations = transaction.operations;
  if (operations.length === 1) {
    validateAddAuthDescriptorOperation(operations[0], pubKey);
  } else if (operations.length === 2) {
    validateRegisterAccountOperation(operations[0]);
    validateAddAuthDescriptorOperation(operations[1], pubKey);
  } else {
    throw new Error(
      `Invalid operation count. Found ${operations.length} operations in sso transaction`
    );
  }
}

export default class SSO {
  accountId: Buffer;
  private tmpSigProv: SignatureProvider;
  signatureProvider: SignatureProvider;

  constructor(
    readonly blockchain: Blockchain,
    signatureProvider: SignatureProvider = new BasicSignatureProvider()
  ) {
    this.signatureProvider = signatureProvider;
  }

  static get vaultUrl(): string {
    return vaultUrl;
  }

  static set vaultUrl(value: string) {
    vaultUrl = value;
  }

  private clear() {
    this.tmpSigProv = undefined;
    this.signatureProvider = undefined;
    this.accountId = undefined;
  }

  private async getAccountAndUserByStoredIds(): Promise<[Account, User]> {
    if (!this.signatureProvider || !this.accountId) {
      return [null, null];
    }

    const authDescriptor = new SingleSignatureAuthDescriptor(
      this.signatureProvider.pubKey,
      [FlagsType.Transfer]
    );

    const user = new User(this.signatureProvider, authDescriptor);

    const account = await this.blockchain
      .newSession(user)
      .getAccountById(this.accountId);

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

    const isAuthDescriptorValid = await account.isAuthDescriptorValid(
      user.authDescriptor.id
    );

    if (!isAuthDescriptorValid) {
      return [null, null];
    }

    return [account, user];
  }

  initiateLogin(successUrl: string, cancelUrl: string) {
    this.clear();

    this.tmpSigProv = new BasicSignatureProvider();

    window.location.href = `${vaultUrl}/?route=/authorize&dappId=${this.blockchain.id.toString(
      "hex"
    )}&pubkey=${this.tmpSigProv.pubKey.toString(
      "hex"
    )}&successAction=${encodeURIComponent(
      successUrl
    )}&cancelAction=${encodeURIComponent(cancelUrl)}&version=0.1`;
  }

  async finalizeLogin(tx: string): Promise<[Account, User]> {
    const sigProv = this.tmpSigProv;
    this.tmpSigProv = undefined;

    if (!sigProv) {
      throw new Error("Error loading public key");
    }

    this.signatureProvider = sigProv;

    const authDescriptor = new SingleSignatureAuthDescriptor(sigProv.pubKey, [
      FlagsType.Transfer,
    ]);

    const user = new User(sigProv, authDescriptor);

    const transaction = await Transaction.fromRawTransaction(
      Buffer.from(tx, "hex"),
      this.blockchain
    ).sign(sigProv);

    validateTransaction(transaction, sigProv.pubKey);

    await transaction.post();

    const accountId = getAccountId(transaction);

    this.accountId = accountId;

    const account = await this.blockchain
      .newSession(user)
      .getAccountById(accountId);

    return [account, user];
  }

  async logout(): Promise<void> {
    const [account, user] = await this.getAccountAndUserByStoredIds();

    if (account && user) {
      await account.deleteAuthDescriptor(user.authDescriptor);
    }

    this.clear();
  }
}
