import KeyPair from "./keyPair";

const hexToBuff = (text: string): Buffer => Buffer.from(text, "hex");
const buffToHex = (buff: Buffer): string => buff.toString("hex");
const ensureBuffer = (buff: Buffer | string): Buffer =>
  buff instanceof Buffer ? buff : hexToBuff(buff);
type Id = string | Buffer;

export { ensureBuffer, hexToBuff, buffToHex, KeyPair, Id };
