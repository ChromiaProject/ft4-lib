import {
  createSingleSigAuthDescriptorRegistration,
  createWeb3ProviderEvmKeyStore,
  registerAccount,
  registrationStrategy,
  Eip1193Provider,
  addAuthDescriptor,
  TxContext,
} from "@chromia/ft4";
import { createClient, formatter, gtv } from "postchain-client";

export {};

let pubKey: string;

async function getClient() {
  return await createClient({
    nodeUrlPool: "http://localhost:7740",
    blockchainIid: 1, // since running with --directory-chain-mock directory chain is in chain 0 so the dapp is in chain 1
  });
}

async function registerEvmAccount() {
  if (typeof window.ethereum === "undefined") {
    alert("MetaMask is not installed!");

    return;
  }

  console.log("Connecting to MetaMask...");

  const client = await getClient();

  try {
    const keyStore = await createWeb3ProviderEvmKeyStore(
      window.ethereum as unknown as Eip1193Provider,
    );

    const authDescriptor = createSingleSigAuthDescriptorRegistration(
      ["A", "T"],
      keyStore.id,
    );

    const { session } = await registerAccount(
      client,
      keyStore,
      registrationStrategy.open(authDescriptor),
    );

    return { session, keyStore };
  } catch (error) {
    console.error(error);
  }
}

async function metamaskLogin() {
  let evmAccount: string | undefined;
  if (!pubKey) {
    alert("=== Provide public key to continue ===");
  } else {
    const result = await registerEvmAccount();

    if (!result) {
      throw new Error("=== Registration failed ===");
    }

    const { session, keyStore } = result;

    evmAccount = session.account.id.toString("hex");
    if (pubKey && evmAccount) {
      const authDataService = session.account.authenticator.authDataService;
      const authDescriptor = createSingleSigAuthDescriptorRegistration(
        ["T"],
        formatter.ensureBuffer(pubKey),
      );

      const mainAuthDescriptor = await session.account.getMainAuthDescriptor();

      const evmKeyHandler = keyStore.createKeyHandler(mainAuthDescriptor);

      const authorizedEvmOperations = await evmKeyHandler.authorize(
        session.account.id,
        addAuthDescriptor(authDescriptor),
        {} as TxContext,
        authDataService,
      );

      const stringHexEncodedTransaction = formatter.ensureString(
        gtv.encode(authorizedEvmOperations),
      );

      console.log(
        "==== stringHexEncodedTransaction=== ",
        stringHexEncodedTransaction,
      );
      console.log("=== COPY THIS ===");
    }
  }
}

async function collectPubkey(pubkey: string) {
  pubKey = pubkey;
  console.log("=== Public key set successfully ===", pubKey);
  return pubkey;
}

(window as any).metamaskLogin = metamaskLogin;
(window as any).collectPubkey = collectPubkey;

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}
