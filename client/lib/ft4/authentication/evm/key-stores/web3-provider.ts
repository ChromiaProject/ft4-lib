import { Buffer } from "buffer";
import { ethers, Eip1193Provider as Eip1193ProviderEthers } from "ethers";
import { EventEmitter } from "events";
import { AnyAuthDescriptor } from "@ft4/accounts";
import { ftEventEmitter } from "@ft4/events";
import {
  EvmKeyStore,
  createEvmKeyHandler,
  signMessage,
} from "@ft4/authentication";

/**
 * Interface that combines `Eip1193Provider` from `ethers` lib with `EventEmitter`
 * functionality.
 */
export interface Eip1193Provider extends Eip1193ProviderEthers, EventEmitter {}

/**
 * Creates a keystore that wraps an external evm keystore, such as MetaMask.
 * In a browser context where the user has the MetaMask browser extension installed
 * and connected to the page, this could be used like:
 * ```
 * createWeb3ProviderEvmKeyStore(window.ethereum)
 * ```
 * @param externalProvider - interface to use when communicating with the external provider
 */
export async function createWeb3ProviderEvmKeyStore(
  externalProvider: Eip1193Provider,
): Promise<EvmKeyStore> {
  const provider = new ethers.BrowserProvider(externalProvider);
  await provider.send("eth_requestAccounts", []);

  const signer = await provider.getSigner();
  const evmAddress = await signer.getAddress();
  const address = Buffer.from(evmAddress.slice(2), "hex");

  externalProvider.once("accountsChanged", (firstAccount) => {
    if (!firstAccount) {
      ftEventEmitter.emit("KeyStoreChange", null);
      return;
    }
    createWeb3ProviderEvmKeyStore(externalProvider).then((keyStore) =>
      ftEventEmitter.emit("KeyStoreChange", keyStore),
    );
  });

  const keyStore = Object.freeze({
    id: address,
    address,
    isInteractive: true,
    signMessage: (message: string) => signMessage(message, signer),
    createKeyHandler: (authDescriptor: AnyAuthDescriptor) =>
      createEvmKeyHandler(authDescriptor, keyStore),
  });

  return keyStore;
}
