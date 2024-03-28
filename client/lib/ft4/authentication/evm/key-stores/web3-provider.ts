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

export interface Eip1193Provider extends Eip1193ProviderEthers, EventEmitter {}

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
