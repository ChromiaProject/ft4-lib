import KeyPair from "./keyPair";

const hexToBuff = (text: string): Buffer => Buffer.from(text, "hex");
const buffToHex = (buff: Buffer): string => buff.toString("hex");

export { hexToBuff, buffToHex, KeyPair };
