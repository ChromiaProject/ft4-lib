import KeyPair from "./keyPair";

// If this is a string, we'll be expecting it to contain HEX.
type BufferId = string | Buffer;

const hexToBuff = (text: string): Buffer => Buffer.from(text, "hex");
const buffToHex = (buff: Buffer): string => buff.toString("hex");
const ensureBuffer = (buff: BufferId): Buffer =>
  buff instanceof Buffer ? buff : hexToBuff(buff);

export { ensureBuffer, hexToBuff, buffToHex, KeyPair, BufferId };
