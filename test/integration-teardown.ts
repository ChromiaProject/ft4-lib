import { unlink } from "node:fs/promises";

export default async function () {
  console.log("Stopping node...");
  await globalThis.__POSTCHAIN__.stop();
  await globalThis.__POSTGRES__.stop();
  await globalThis.__NETWORK__.stop();
  await unlink("node-url.txt");
  console.log("...stopped node");
}
