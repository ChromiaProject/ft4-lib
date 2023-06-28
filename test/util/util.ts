import { randomBytes } from "crypto";
import { encryption, gtv } from "postchain-client";
import { KeyPair } from "../../client/lib/cryptoUtils";
import { AuthDescriptor } from "../../client/lib/ft3/account/auth-descriptor/types";
import { authDescriptor } from "../../client/lib/ft3/account/auth-descriptor";
import { GtxClient } from "postchain-client/built/src/gtx/interfaces";
import { Buffer } from "buffer";

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

export function createTestAuthDescriptor(flags: string[] = []): {
  keyPair: KeyPair;
  authDescriptor: AuthDescriptor;
} {
  const keyPair = new KeyPair();
  const descriptor = authDescriptor.create.singleSig.withArgs(
    flags,
    keyPair.pubKey
  ).andNoRules;

  return { keyPair, authDescriptor: descriptor };
}

export async function createAccount(client: GtxClient, ad: AuthDescriptor) {
  const tx = client.newTransaction([]);
  tx.addOperation("ft4.register_account_test", authDescriptor.toGtv(ad) as any);
  await tx.postAndWaitConfirmation();
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
