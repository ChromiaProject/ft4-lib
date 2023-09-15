import { Buffer } from "buffer";
import { ethers } from "ethers";
import { EventEmitter } from "events";
import { EvmKeyStore, signMessage } from "..";
import { createEvmKeyHandler } from "../key-handler";
import { AnyAuthDescriptor } from "/ft4/accounts/auth-descriptor/types";
import { ftEventEmitter } from "/ft4/events";

export interface Eip1193Provider extends ethers.Eip1193Provider, EventEmitter {}

export async function createWeb3ProviderEvmKeyStore(
  externalProvider: Eip1193Provider,
): Promise<EvmKeyStore> {
  const provider = new ethers.BrowserProvider(externalProvider);
  await provider.send("eth_requestAccounts", []);

  const signer = await provider.getSigner();
  const ethAddress = await signer.getAddress();
  const address = Buffer.from(ethAddress.slice(2), "hex");

  externalProvider.once("accountsChanged", () => {
    createWeb3ProviderEvmKeyStore(externalProvider).then((keyStore) =>
      ftEventEmitter.emit("KeyStoreChanged", keyStore),
    );
  });

  const keyStore = Object.freeze({
    id: address,
    address,
    isInteractive: true,
    signMessage: (message: string) => signMessage(message, signer),
    // FIXME
    sign: (digestToSign: Buffer) => Promise.resolve(digestToSign),
    createKeyHandler: (authDescriptor: AnyAuthDescriptor) =>
      createEvmKeyHandler(authDescriptor, keyStore),
  });

  return keyStore;
}
