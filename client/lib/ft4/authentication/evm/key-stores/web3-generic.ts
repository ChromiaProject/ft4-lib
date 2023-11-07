import { Buffer } from "buffer";
import { sliceSignature } from "..";
import { createEvmKeyHandler } from "../key-handler";
import { AnyAuthDescriptorRegistration } from "/ft4/accounts/auth-descriptor/types";

export async function createGenericEvmKeyStore(config: {
  address: string;
  signMessage: (message: string) => Promise<string>;
  isInteractive: boolean | undefined;
}) {
  const address = Buffer.from(config.address.slice(2), "hex");
  const keyStore = Object.freeze({
    id: address,
    address,
    isInteractive: config.isInteractive ?? true,
    signMessage: (message: string) =>
      config.signMessage(message).then(sliceSignature),
    sign: (digestToSign: Buffer) => Promise.resolve(digestToSign),
    createKeyHandler: (authDescriptor: AnyAuthDescriptorRegistration) =>
      createEvmKeyHandler(authDescriptor, keyStore),
  });
  return keyStore;
}
