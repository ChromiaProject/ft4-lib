import { EvmKeyStore, signMessage } from "..";
import { ethers } from "ethers";
import { createEvmKeyHandler } from "../key-handler";
import { AuthDescriptor } from "../../../accounts/auth-descriptor/types";
import { Buffer } from "buffer";

export async function createWeb3ProviderEvmKeyStore(
  externalProvider: ethers.Eip1193Provider
): Promise<EvmKeyStore> {
  const provider = new ethers.BrowserProvider(externalProvider);
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  const ethAddress = await signer.getAddress();
  const address = Buffer.from(ethAddress.slice(2), "hex");
  const keyStore = Object.freeze({
    id: address,
    address,
    isInteractive: true,
    signMessage: (message: string) => signMessage(message, signer),
    // FIXME
    sign: (digestToSign: Buffer) => Promise.resolve(digestToSign),
    createKeyHandler: (authDescriptor: AuthDescriptor) =>
      createEvmKeyHandler(authDescriptor, keyStore),
  });
  return keyStore;
}
