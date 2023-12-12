import { unlink } from "node:fs/promises";

export default async function (globalConfig, projectConfig) {
  console.log("Stopping node...");
  await globalThis.__POSTCHAIN__.stop();
  await globalThis.__POSTGRES__.stop();
  await unlink("node-url.txt");
  console.log("...stopped node");
}
