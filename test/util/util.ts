import {
  AnyAuthDescriptor,
  AnyAuthDescriptorRegistration,
  AuthDescriptor,
  AuthDescriptorRegistration,
  AuthDescriptorRules,
  AuthFlag,
  AuthenticatedAccount,
  MultiSig,
  SingleSig,
  addAuthDescriptor,
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
  Session,
  createAuthDataService,
  createConnection,
  createKeyStoreInteractor,
  createSession,
} from "@ft4/ft-session";
import { getExpectedAccountIdFromMainAuthDescriptor, op } from "@ft4/utils";
import { Buffer } from "buffer";
import {
  BufferId,
  IClient,
  KeyPair,
  MERKLE_HASH_VERSIONS,
  Operation,
  RellOperation,
  SignatureProvider,
  encryption,
  formatter,
  gtx,
  gtv as pclGtv,
} from "postchain-client";
import { User, FT4_USER_TYPE } from "./test-user";
import { transactionBuilder } from "@ft4/transaction-builder";
import { Amount, Asset } from "@ft4/asset";

function generateId(n: number): Buffer {
  return encryption.hash256(Buffer.from(`${n}`));
}

function blockchainAccountId(blockchainRid: Buffer) {
  // doesn't matter, it's an array of non-array values
  return pclGtv.gtvHash(["B", blockchainRid], MERKLE_HASH_VERSIONS.ONE);
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
      // doesn't matter as it's single sig
      pclGtv.gtvHash(keyPair.pubKey, MERKLE_HASH_VERSIONS.ONE),
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
    accountType: FT4_USER_TYPE,
    id: deriveAuthDescriptorId(ad, MERKLE_HASH_VERSIONS.ONE), //ok because it's single sig
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
    id: deriveAuthDescriptorId(reg as any, MERKLE_HASH_VERSIONS.ONE), //ok because it's single sig
    accountId: deriveAuthDescriptorId(reg as any, MERKLE_HASH_VERSIONS.ONE), //ok because it's single sig
    accountType: FT4_USER_TYPE,
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
      "ft4.test.register_account",
      gtv.authDescriptorRegistrationToGtv(descriptor),
    ),
    adminUser().signatureProvider,
  );
  return getExpectedAccountIdFromMainAuthDescriptor(descriptor, client);
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

export function getSessionForAuthenticatedAccount(
  account: AuthenticatedAccount,
): Session {
  return createSession(
    account.authenticator.authDataService.connection,
    account.authenticator,
  );
}

/**
 * Converts amount bigint to string so it can be used to compare Amount with jest
 */
export function comparableAmount(amount: Amount): string {
  return amount.value.toString();
}

/**
 * Converts asset's supply property from bigint to string so it can be used to compare Asset with jest
 */
export function comparableAsset(asset: Asset) {
  return { ...asset, supply: asset.supply.toString() };
}

export function comparableObjectWithAmount(object: ObjectWithAmount) {
  return { ...object, amount: comparableAmount(object.amount) };
}

/**
 * Converts an object with asset and amount properties to use string instead of bigint
 */
export function comparableObjectWithAssetAndAmount(
  object: ObjectWithAssetAndAmount,
) {
  return {
    ...object,
    asset: comparableAsset(object.asset),
    amount: comparableAmount(object.amount),
  };
}

export type ObjectWithAmount = {
  amount: Amount;
} & { [key: string]: any };

export type ObjectWithAssetAndAmount = {
  asset: Asset;
  amount: Amount;
} & { [key: string]: any };

export function rellError(message: string) {
  return expect.objectContaining({
    shortReason: message,
  });
}

export function opToRellOp(operation: Operation): RellOperation {
  return {
    opName: operation.name,
    args: operation.args || [],
  };
}

export function emptyOp(): Operation {
  return { name: "ft4.test.empty_op", args: [] };
}

export function rejectedOp(): Operation {
  return { name: "ft4.test.rejected_op", args: [] };
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
    MERKLE_HASH_VERSIONS.ONE, // doesn't matter, it's an array of buffers or a buffer
  );
}

export function lockAccountId(accountId: BufferId, lockType: string): Buffer {
  return pclGtv.gtvHash(
    [formatter.ensureBuffer(accountId), "FT4_LOCK", lockType],
    MERKLE_HASH_VERSIONS.ONE, // doesn't matter, it's an array of non-array values
  );
}
