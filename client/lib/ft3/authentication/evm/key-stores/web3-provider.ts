import { EVMKeyStore, signMessage } from "..";
import { ethers } from "ethers";
import { createEVMKeyHandler } from "../key-handler";
import { AuthDescriptor } from "../../../account/auth-descriptor/types";

export async function createWeb3ProviderEVMKeyStore(
  externalProvider: ethers.providers.ExternalProvider
): Promise<EVMKeyStore> {
  const provider = new ethers.providers.Web3Provider(externalProvider);
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
      createEVMKeyHandler(authDescriptor, keyStore),
  });
  return keyStore;
}
