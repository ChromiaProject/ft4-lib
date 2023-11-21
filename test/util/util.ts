import {
  encryption,
  gtv as pclGtv,
  IClient,
  SignatureProvider,
  KeyPair,
  Operation,
  RellOperation,
} from "postchain-client";
import {
  AnyAuthDescriptorRegistration,
  AuthDescriptorRegistration,
  AuthDescriptorRule,
  MultiSig,
  SingleSig,
} from "/ft4/accounts/auth-descriptor/types";
import { Buffer } from "buffer";
import { op } from "/ft4/utils";
import adminUser from "./admin_user";
import { createInMemoryFtKeyStore } from "/ft4/authentication/ft/key-stores/in-memory";
import { createAuthenticator } from "/ft4/authentication";
import { transactionBuilder } from "/ft4/utils/transaction-builder";
import { addAuthDescriptor } from "/ft4/accounts/account-operations";
import {
  gtv,
  deriveAccountId,
  createMultiSignatureAuthDescriptorRegistration,
  createSingleSignatureAuthDescriptorRegistration,
} from "/ft4/accounts/auth-descriptor";
import {
  createAuthDataService,
  createConnection,
  createKeyStoreInteractor,
} from "/ft4/ft-session";
import { Connection } from "/ft4";
import { BufferId } from "/ft4/utils/types";

function generateNumber(): number {
  return Date.now();
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
  return pclGtv.gtvHash(["B", brid]);
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

export function createTestAuthDescriptorRegistration(
  flags: string[] = [],
  rules: AuthDescriptorRule | null = null,
): {
  keyPair: KeyPair;
  authDescriptorRegistration: AuthDescriptorRegistration<SingleSig>;
} {
  const keyPair = encryption.makeKeyPair();
  const ad = createSingleSignatureAuthDescriptorRegistration(
    {
      flags,
      signer: keyPair.pubKey,
    },
    rules,
  );
  return { keyPair, authDescriptorRegistration: ad };
}

export function createTestMultisigAuthDescriptorRegistration(
  signaturesRequired: number,
  flags: string[] = [],
): {
  keyPairs: KeyPair[];
  authDescriptorRegistration: AuthDescriptorRegistration<MultiSig>;
} {
  const keyPairs = Array.from({ length: signaturesRequired }, () =>
    encryption.makeKeyPair(),
  );
  const descriptor = createMultiSignatureAuthDescriptorRegistration(
    {
      flags,
      signaturesRequired,
      signers: keyPairs.map((kp) => kp.pubKey),
    },
    null,
  );

  return { keyPairs, authDescriptorRegistration: descriptor };
}

export async function addAuthDescriptorTo(
  client: IClient,
  accountId: Buffer,
  user: {
    signatureProvider: SignatureProvider;
    authDescriptorRegistration: AnyAuthDescriptorRegistration;
  },
  newUser: {
    signatureProvider: SignatureProvider;
    authDescriptorRegistration: AnyAuthDescriptorRegistration;
  },
) {
  const keyHandlerUser1 = createInMemoryFtKeyStore(
    user.signatureProvider,
  ).createKeyHandler(user.authDescriptorRegistration);

  const keyHandlerUser2 = createInMemoryFtKeyStore(
    newUser.signatureProvider,
  ).createKeyHandler(newUser.authDescriptorRegistration);

  const authDataService = createAuthDataService(createConnection(client));
  const authenticator = createAuthenticator(
    accountId,
    [keyHandlerUser1],
    authDataService,
  );

  const tx = await transactionBuilder(authenticator, client)
    .add(addAuthDescriptor(newUser.authDescriptorRegistration))
    .addSigners(keyHandlerUser2)
    .build();
  return client.sendTransaction(tx);
}

export async function createAccount(
  client: IClient,
  descriptor: AnyAuthDescriptorRegistration,
) {
  await client.signAndSendUniqueTransaction(
    op(
      "register_account_test",
      gtv.authDescriptorRegistrationToGtv(descriptor),
    ),
    adminUser().signatureProvider,
  );
  return deriveAccountId(descriptor);
}

export async function getSessionForAccount(
  connection: Connection,
  accountId: BufferId,
  signer: SignatureProvider | KeyPair,
) {
  const { getSession } = createKeyStoreInteractor(
    connection.client,
    createInMemoryFtKeyStore(signer),
  );

  return await getSession(accountId);
}

export function rellError(message: string) {
  return expect.objectContaining({
    shortReason: message,
  });
}

export function opToRellOp(operation: Operation): RellOperation {
  return {
    opName: operation.name,
    args: operation.args ?? [],
  };
}

export function emptyOp(): Operation {
  return { name: "empty_op", args: [] };
}
