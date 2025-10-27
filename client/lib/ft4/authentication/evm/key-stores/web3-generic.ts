import { Buffer } from "buffer";
import { AnyAuthDescriptor } from "@ft4/accounts";
import {
  EvmKeyStore,
  createEvmKeyHandler,
  sliceSignature,
} from "@ft4/authentication";

/**
 * Creates a EvmKeyStore instance with the specified parameters. This allows
 * the caller to create a custom implementation of an `EvmKeyStore`. This is
 * useful to add support for different web3 providers that are not supported
 * by any of the currently provided implementations.
 * @param config - the config to use when creating the key store
 * @returns `EvmKeyStore` instance with the provided configuration
 */
export async function createGenericEvmKeyStore(config: {
  /**
   * The evm address that corresponds to the key that this keystore holds
   */
  address: string;
  /**
   * Function that will be used to sign a message
   * @param message - the message to sign
   * @returns signature encoded as a string
   */
  signMessage: (message: string) => Promise<string>;
  /**
   * Is this an interactive keystore
   */
  isInteractive: boolean | undefined;
  /**
   * The merkle hash version to use
   */
  merkleHashVersion: number;
}): Promise<EvmKeyStore> {
  const address = Buffer.from(config.address.slice(2), "hex");
  const keyStore = Object.freeze({
    id: address,
    address,
    isInteractive: config.isInteractive ?? true,
    signMessage: (message: string) =>
      config.signMessage(message).then(sliceSignature),
    createKeyHandler: (authDescriptor: AnyAuthDescriptor) =>
      createEvmKeyHandler(authDescriptor, keyStore),
  });
  return keyStore;
}
