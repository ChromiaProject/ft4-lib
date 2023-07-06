import { randomBytes } from "crypto";
import {
  encryption,
  gtv,
  GtxClient,
  IClient,
  Itransaction,
  SignatureProvider,
} from "postchain-client";
import { KeyPair } from "../../client/lib/cryptoUtils";
import {
  AuthDescriptor,
  AuthDescriptorRule,
} from "../../client/lib/ft4/accounts/auth-descriptor/types";
import { authDescriptor } from "../../client/lib/ft4/accounts/auth-descriptor";
import { TxBuilderTransaction } from "/ft4/utils/types";
import { Buffer } from "buffer";
import { _op } from "/ft4/utils";
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
  return `C${generateNumber()}`;
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
  rules?: AuthDescriptorRule
): {
  keyPair: KeyPair;
  authDescriptor: AuthDescriptor;
} {
  const keyPair = new KeyPair();
  const ad = authDescriptor.create.singleSig.withArgs(flags, keyPair.pubKey);
  const descriptor = rules ? ad.andRules(rules) : ad.andNoRules;

  return { keyPair, authDescriptor: descriptor };
}

export function createTestMultisigAuthDescriptor(
  requiredSignatures: number,
  flags: string[] = []
): {
  keyPairs: KeyPair[];
  authDescriptor: AuthDescriptor;
} {
  const keyPairs = Array.from(
    { length: requiredSignatures },
    () => new KeyPair()
  );
  const descriptor = authDescriptor.create.multiSig.withArgs(
    flags,
    requiredSignatures,
    keyPairs.map((kp) => kp.pubKey)
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
  }
) {
  const keyHandlerUser1 = createInMemoryFtKeyStore(
    user.signatureProvider
  ).createKeyHandler(user.authDescriptor);

  const keyHandlerUser2 = createInMemoryFtKeyStore(
    newUser.signatureProvider
  ).createKeyHandler(newUser.authDescriptor);

  const authDataService = createAuthDataService(createConnection(client));
  const authenticator = createAuthenticator(
    accountId,
    [keyHandlerUser1],
    authDataService
  );

  const tx = await transactionBuilder(authenticator, client)
    .add(addAuthDescriptor(newUser.authDescriptor))
    .addSigners(keyHandlerUser2)
    .build();
  return client.sendTransaction(tx);
}

export async function createAccount(client: IClient, ad: AuthDescriptor) {
  await client.signAndSendUniqueTransaction(
    _op("register_account_test", authDescriptor.toGtv(ad) as any),
    adminUser().signatureProvider
  );
  return ad.id;
}

export function toNewTx(tx: Itransaction): TxBuilderTransaction {
  return {
    ...tx.gtx,
    signatures: tx.gtx.signatures ?? [],
  };
}

export async function registerAsset(
  client: GtxClient,
  assetName: string,
  decimals = 0,
  blockchainRID: Buffer = randomBytes(32)
) {
  const txn = client.newTransaction([]);
  txn.addOperation(
    "register_asset",
    assetName,
    generateAssetSymbol(),
    decimals,
    blockchainRID,
    ""
  );
  await txn.postAndWaitConfirmation();
}
