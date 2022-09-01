import KeyPair from "./keyPair";

type Id = string | Buffer;

const hexToBuff = (text: string): Buffer => Buffer.from(text, "hex");
const buffToHex = (buff: Buffer): string => buff.toString("hex");
const ensureBuffer = (buff: Id): Buffer =>
  buff instanceof Buffer ? buff : hexToBuff(buff);

export { ensureBuffer, hexToBuff, buffToHex, KeyPair, Id };
