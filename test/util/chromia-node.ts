import { IClient } from "postchain-client";
import { createChromiaClient } from "@ft4/util/blockchain-util";
import { readFile } from "node:fs/promises";

export function useChromiaNode() {
  let client: IClient;

  beforeAll(async () => {
    const url = await readFile("node-url.txt", { encoding: "utf8" });
    client = await createChromiaClient(url);
  });

  return () => client;
}
