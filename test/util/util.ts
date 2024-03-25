import { Buffer } from "buffer";
import {
  IClient,
  KeyPair,
  Operation,
  RellOperation,
  SignatureProvider,
  encryption,
  gtv as pclGtv,
} from "postchain-client";
import adminUser from "./admin_user";
import { AuthDescriptorRules, Connection } from "@ft4/index";
import { addAuthDescriptor } from "@ft4/accounts/account-operations";
import {
  createMultiSigAuthDescriptorRegistration,
  createSingleSigAuthDescriptorRegistration,
  deriveAuthDescriptorId,
  gtv,
} from "@ft4/accounts/auth-descriptor";
import {
  AnyAuthDescriptor,
  AnyAuthDescriptorRegistration,
  AuthDescriptor,
  AuthDescriptorRegistration,
  MultiSig,
  SingleSig,
} from "@ft4/accounts/auth-descriptor/types";
import { FtKeyStore, createAuthenticator } from "@ft4/authentication";
import { createInMemoryFtKeyStore } from "@ft4/authentication/ft/key-stores/in-memory";
import {
  createAuthDataService,
  createConnection,
  createKeyStoreInteractor,
} from "@ft4/ft-session";
import { op } from "@ft4/utils";
import { transactionBuilder } from "@ft4/transaction-builder";
import { BufferId } from "@ft4/utils/types";

function generateId(n: number): Buffer {
  return encryption.hash256(Buffer.from(`${n}`));
}

function blockchainAccountId(blockchainRid: Buffer) {
  return pclGtv.gtvHash(["B", blockchainRid]);
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

export { LocalStorageMock, blockchainAccountId, generateId };

export function createTestAuthDescriptor(
  flags: string[] = [],
  rules: AuthDescriptorRules | null = null,
): {
  keyPair: KeyPair;
  authDescriptor: AuthDescriptor<SingleSig>;
  keyStore: FtKeyStore;
} {
  const keyPair = encryption.makeKeyPair();
  const ad = createSingleSigAuthDescriptorRegistration(
    flags,
    keyPair.pubKey,
    rules,
  );
  return {
    keyPair,
    authDescriptor: {
      ...ad,
      id: deriveAuthDescriptorId(ad),
      accountId: deriveAuthDescriptorId(ad),
      created: new Date(0),
    },
    keyStore: createInMemoryFtKeyStore(keyPair),
  };
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
  const descriptor = createMultiSigAuthDescriptorRegistration(
    flags,
    keyPairs.map((kp) => kp.pubKey),
    signaturesRequired,
    null,
  );

  return { keyPairs, authDescriptorRegistration: descriptor };
}

export function testAdFromRegistration<T extends SingleSig | MultiSig>(
  reg: AuthDescriptorRegistration<T>,
): AuthDescriptor<T> {
  return {
    ...reg,
    id: deriveAuthDescriptorId(reg as any),
    accountId: deriveAuthDescriptorId(reg as any),
    created: new Date(),
  };
}

export async function addAuthDescriptorTo(
  client: IClient,
  accountId: Buffer,
  user: {
    signatureProvider: SignatureProvider;
    authDescriptor: AnyAuthDescriptor;
  },
  newUser: {
    signatureProvider: SignatureProvider;
    authDescriptor: AnyAuthDescriptor;
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
    .addSigners(keyHandlerUser2.keyStore as FtKeyStore)
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
  return deriveAuthDescriptorId(descriptor);
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

export function rejectedOp(): Operation {
  return { name: "rejected_op", args: [] };
}

export function* numberGenerator(): Generator<number> {
  let count = 0;
  while (true) {
    yield count++;
  }
}

export function* asyncNumberGenerator(): Generator<Promise<number>> {
  let count = 0;
  while (true) {
    yield Promise.resolve(count++);
  }
}
