import {
  encryption,
  gtv,
  IClient,
  SignatureProvider,
  KeyPair,
  Operation,
  RellOperation,
} from "postchain-client";
import {
  AuthDescriptor,
  AuthDescriptorRule,
} from "../../client/lib/ft4/accounts/auth-descriptor/types";
import { authDescriptor } from "../../client/lib/ft4/accounts/auth-descriptor";
import { Buffer } from "buffer";
import { op } from "/ft4/utils";
import adminUser from "./admin_user";
import { createInMemoryFtKeyStore } from "/ft4/authentication/ft/key-stores/in-memory";
import { createAuthenticator } from "/ft4/authentication";
import { transactionBuilder } from "/ft4/utils/transaction-builder";
import { addAuthDescriptor } from "/ft4/accounts/account-operations";
import { createAuthDataService, createConnection } from "/ft4/ft-session";

function generateNumber(max = 10000): number {
  return Math.round(Math.random() * max);
}

function generateAssetName(prefix = "CHROMA"): string {
  return prefix + "_" + generateNumber();
}

function generateAssetSymbol(): string {
  return `C${generateNumber()}${generateNumber()}`;
}

function generateId(): Buffer {
  return encryption.hash256(Buffer.from(`${generateNumber()}`));
}

function blockchainAccountId(brid: Buffer) {
  return gtv.gtvHash(["B", brid]);
}

class LocalStorageMock implements Storage {
  constructor(private store = {}) {}

  clear() {
    this.store = {};
  }

  getItem(key) {
    return this.store[key] || null;
  }

  setItem(key, value) {
    this.store[key] = String(value);
  }

  removeItem(key) {
    delete this.store[key];
  }

  get length(): number {
    return Object.keys(this.store).length;
  }

  key(index: number): string | null {
    if (index > Object.keys(this.store).length) return null;
    return Object.keys(this.store).sort()[index];
  }
}

export {
  generateAssetName,
  generateAssetSymbol,
  generateId,
  blockchainAccountId,
  LocalStorageMock,
};

export function createTestAuthDescriptor(
  flags: string[] = [],
  rules?: AuthDescriptorRule,
): {
  keyPair: KeyPair;
  authDescriptor: AuthDescriptor;
} {
  const keyPair = encryption.makeKeyPair();
  const ad = authDescriptor.create.singleSig.withArgs(flags, keyPair.pubKey);
  const descriptor = rules ? ad.andRules(rules) : ad.andNoRules;

  return { keyPair, authDescriptor: descriptor };
}

export function createTestMultisigAuthDescriptor(
  requiredSignatures: number,
  flags: string[] = [],
): {
  keyPairs: KeyPair[];
  authDescriptor: AuthDescriptor;
} {
  const keyPairs = Array.from({ length: requiredSignatures }, () =>
    encryption.makeKeyPair(),
  );
  const descriptor = authDescriptor.create.multiSig.withArgs(
    flags,
    requiredSignatures,
    keyPairs.map((kp) => kp.pubKey),
  ).andNoRules;

  return { keyPairs, authDescriptor: descriptor };
}

export async function addAuthDescriptorTo(
  client: IClient,
  accountId: Buffer,
  user: {
    signatureProvider: SignatureProvider;
    authDescriptor: AuthDescriptor;
  },
  newUser: {
    signatureProvider: SignatureProvider;
    authDescriptor: AuthDescriptor;
  },
) {
  const keyHandlerUser1 = createInMemoryFtKeyStore(
    user.signatureProvider,
  ).createKeyHandler(user.authDescriptor);

  const keyHandlerUser2 = createInMemoryFtKeyStore(
    newUser.signatureProvider,
  ).createKeyHandler(newUser.authDescriptor);

  const authDataService = createAuthDataService(createConnection(client));
  const authenticator = createAuthenticator(
    accountId,
    [keyHandlerUser1],
    authDataService,
  );

  const tx = await transactionBuilder(authenticator, client)
    .add(addAuthDescriptor(newUser.authDescriptor))
    .addSigners(keyHandlerUser2)
    .build();
  return client.sendTransaction(tx);
}

export async function createAccount(
  client: IClient,
  descriptor: AuthDescriptor,
) {
  const ad = authDescriptor.toGtv(descriptor);
  await client.signAndSendUniqueTransaction(
    op("register_account_test", [ad[1], ad[2], ad[3]]),
    adminUser().signatureProvider,
  );
  return descriptor.id;
}

export function rellError(message: string) {
  return expect.objectContaining({
    shortReason: message,
  });
}

export function opToRellOp(operation: Operation): RellOperation {
  return {
    opName: operation.name,
    args: operation.args,
  };
}
