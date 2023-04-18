import { encryption, gtv } from "postchain-client";

function generateNumber(max = 10000): number {
  return Math.round(Math.random() * max);
}

function generateAssetName(prefix = "CHROMA"): string {
  return prefix + "_" + generateNumber();
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

export { generateAssetName, generateId, blockchainAccountId, LocalStorageMock };
