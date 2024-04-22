import {
  AnyAuthDescriptor,
  AnyAuthDescriptorRegistration,
  AuthDescriptor,
  AuthDescriptorRegistration,
  AuthDescriptorRules,
  AuthFlag,
  MultiSig,
  SingleSig,
  addAuthDescriptor,
  aggregateSigners,
  createMultiSigAuthDescriptorRegistration,
  createSingleSigAuthDescriptorRegistration,
  deriveAuthDescriptorId,
  gtv,
} from "@ft4/accounts";
import {
  FtKeyStore,
  createAuthenticator,
  createInMemoryFtKeyStore,
} from "@ft4/authentication";
import {
  Connection,
  createAuthDataService,
  createConnection,
  createKeyStoreInteractor,
} from "@ft4/ft-session";
import { BufferId, op } from "@ft4/utils";
import { Buffer } from "buffer";
import {
  IClient,
  KeyPair,
  Operation,
  RellOperation,
  SignatureProvider,
  encryption,
  formatter,
  gtx,
  gtv as pclGtv,
} from "postchain-client";
import { User } from "./test-user";
import { transactionBuilder } from "@ft4/transaction-builder";

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

export function adminUser(): User {
  const keyPair = encryption.makeKeyPair(
    process.env.TEST_ADMIN_1_PRIV ||
      "00CED79962D1150BF844CACB76310D4746C4426558A7FD9C827B30203DACC4CE",
  );

  const signatureProvider = gtx.newSignatureProvider(keyPair);
  const singleSigAuthDescriptor = createSingleSigAuthDescriptorRegistration(
    [AuthFlag.Account, AuthFlag.Transfer],
    signatureProvider.pubKey,
    null,
  );
  return {
    signatureProvider,
    authDescriptor: testAdFromRegistration(singleSigAuthDescriptor),
    keyStore: createInMemoryFtKeyStore(keyPair),
  };
}

export const adminKeyPair = encryption.makeKeyPair(
  process.env.TEST_ADMIN_1_PRIV ||
    "00CED79962D1150BF844CACB76310D4746C4426558A7FD9C827B30203DACC4CE",
);

export function createTestAuthDescriptor(
  flags: string[] = [],
  rules: AuthDescriptorRules | null = null,
): {
  keyPair: KeyPair;
  authDescriptor: AuthDescriptor<SingleSig>;
  keyStore: FtKeyStore;
} {
  const keyPair = encryption.makeKeyPair();
  return {
    keyPair,
    authDescriptor: createTestAuthDescriptorWithSigner(
      pclGtv.gtvHash(keyPair.pubKey),
      keyPair.pubKey,
      flags,
      rules,
    ),
    keyStore: createInMemoryFtKeyStore(keyPair),
  };
}

export function createTestAuthDescriptorWithSigner(
  accountId: BufferId,
  signer: BufferId,
  flags: string[] = [],
  rules: AuthDescriptorRules | null = null,
): AuthDescriptor<SingleSig> {
  const ad = createSingleSigAuthDescriptorRegistration(
    flags,
    formatter.ensureBuffer(signer),
    rules,
  );

  return {
    accountId: formatter.ensureBuffer(accountId),
    id: deriveAuthDescriptorId(ad),
    created: new Date(0),
    ...ad,
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
    .add(addAuthDescriptor(newUser.authDescriptor), {
      signers: [keyHandlerUser2.keyStore],
    })
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
  return getAccountIdFromAuthDescriptor(descriptor);
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

export function getAccountIdFromAuthDescriptor(
  authDescriptor: AnyAuthDescriptor | AnyAuthDescriptorRegistration,
): Buffer {
  const signers = aggregateSigners(authDescriptor);
  return pclGtv.gtvHash(
    signers.length === 1 ? signers[0] : signers.sort(Buffer.compare),
  );
}
