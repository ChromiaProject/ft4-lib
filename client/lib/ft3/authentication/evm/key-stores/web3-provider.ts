import { EVMKeyStore, signMessage } from "..";
import { ethers } from "ethers";
import { createEVMKeyHandler } from "../key-handler";
import { AuthDescriptor } from "../../../account/auth-descriptor/types";

export async function createWeb3ProviderEVMKeyStore(
  eip1193Provider: ethers.Eip1193Provider
): Promise<EVMKeyStore> {
  const provider = new ethers.BrowserProvider(eip1193Provider);
  const signer = await provider.getSigner();
  const address = Buffer.from(signer.address.slice(2), "hex");
  const keyStore = Object.freeze({
    id: address,
    address,
    isInteractive: true,
    signMessage: (message: string) => signMessage(message, signer),
    // FIXME
    sign: (digestToSign: Buffer) => Promise.resolve(digestToSign),
    createKeyHandler: (authDescriptor: AuthDescriptor) =>
      createEVMKeyHandler(authDescriptor, keyStore),
  });
  return keyStore;
}
