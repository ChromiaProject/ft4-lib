import {
  createClient,
  encryption,
  formatter,
  gtv,
  KeyPair,
  newSignatureProvider,
  Operation,
} from "postchain-client";

import readline from "readline/promises";
import { stdin as input, stdout as output } from "node:process";

async function getClient() {
  return await createClient({
    nodeUrlPool: "http://localhost:7740",
    blockchainIid: 1, // since running with --directory-chain-mock directory chain is in chain 0 so the dapp is in chain 1
  });
}

async function main(): Promise<void> {
  const keyPair = encryption.makeKeyPair();
  console.log(
    "=== Created pubkey is ===",
    formatter.ensureString(keyPair.pubKey),
  );
  const rl = readline.createInterface({ input, output });

  const hexTransaction = await rl.question(
    "Paste the string hex encoded transaction here: ",
  );
  rl.close();

  if (!hexTransaction) {
    console.error("Hex transaction was not provided!");
    process.exit(1);
  }

  await sendEncodedTransaction(keyPair, hexTransaction);
}

async function sendEncodedTransaction(
  signersKeyPair: KeyPair,
  hexTransaction: string,
) {
  const client = await getClient();

  const decodedTransaction = gtv.decode(
    formatter.ensureBuffer(hexTransaction),
  ) as Operation[];

  if (!decodedTransaction) {
    throw new Error("Transaction cannot be empty!");
  }
  try {
    await client.signAndSendUniqueTransaction(
      { operations: decodedTransaction, signers: [signersKeyPair.pubKey] },
      newSignatureProvider(client.config.merkleHashVersion, signersKeyPair),
    );

    console.log("\n==============================");
    console.log("Transaction sent successfully!");
    console.log("==============================\n");
  } catch (error) {
    console.error(error);
  }
}

await main();
