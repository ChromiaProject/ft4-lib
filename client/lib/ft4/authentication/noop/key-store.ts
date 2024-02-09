import { AnyAuthDescriptorRegistration } from "@ft4/accounts";
import { KeyStore } from "@ft4/index";
import { noopKeyHandler } from "./key-handler";

export const nullKeyStore: KeyStore = Object.freeze({
  id: Buffer.alloc(32, 0),
  isInteractive: false,
  sign: (tx: Buffer) => Promise.resolve(tx),
  createKeyHandler: (
    _authDescriptor: AnyAuthDescriptorRegistration | undefined,
  ) => noopKeyHandler,
});
