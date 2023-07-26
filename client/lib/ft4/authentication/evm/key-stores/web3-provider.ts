import { EvmKeyStore, signMessage } from "..";
import { ethers } from "ethers";
import { createEvmKeyHandler } from "../key-handler";
import { AuthDescriptor } from "../../../accounts/auth-descriptor/types";
import { ftEventEmitter } from "../../../events";
import { Buffer } from "buffer";

interface Eip1193ProviderWithEvents extends ethers.Eip1193Provider {
  on?: (event: string, listener: (...args: any[]) => void) => void;
}

export async function createWeb3ProviderEvmKeyStore(
  externalProvider: ethers.Eip1193Provider,
): Promise<EvmKeyStore> {
  const providerWithEvents = externalProvider as Eip1193ProviderWithEvents;

  const provider = new ethers.BrowserProvider(externalProvider);
  await provider.send("eth_requestAccounts", []);

  const signer = await provider.getSigner();
  let ethAddress = await signer.getAddress();

  const buildKeyStore = (ethAddress: string): EvmKeyStore => {
    const address = Buffer.from(ethAddress.slice(2), "hex");
    return {
      id: address,
      address,
      isInteractive: true,
      signMessage: (message: string) => signMessage(message, signer),
      createKeyHandler: (authDescriptor: AuthDescriptor) =>
        createEvmKeyHandler(authDescriptor, keyStore),
    };
  };

  let keyStore = buildKeyStore(ethAddress);

  if (providerWithEvents.on) {
    providerWithEvents.on("accountsChanged", ([newAddress]) => {
      if (newAddress !== ethAddress) {
        ethAddress = newAddress;
        keyStore = buildKeyStore(ethAddress);
        ftEventEmitter.emit("AccountAddressChange", newAddress);
      }
    });
  }

  return keyStore;
}
