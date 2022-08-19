import { util, gtv } from "postchain-client";

function generateNumber(max = 10000): number {
  return Math.round(Math.random() * max);
}

function generateAssetName(prefix = "CHROMA"): string {
  return prefix + "_" + generateNumber();
}

function generateId(): Buffer {
  return util.hash256(`${generateNumber()}`);
}

function blockchainAccountId(brid: Buffer) {
  return gtv.gtvHash(["B", brid]);
}

export { generateAssetName, generateId, blockchainAccountId };
