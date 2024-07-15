import { IClient } from "postchain-client";
import { createChromiaClient } from "@ft4-test/util";
import { readFile } from "node:fs/promises";
import fetch from "node-fetch";

export function useChromiaNode() {
  let client: IClient;

  beforeAll(async () => {
    const url = await readFile("node-url.txt", { encoding: "utf8" });
    console.log("READING FILE URL################", url);
    const response = await fetch(`${url}/brid/iid_0`);
    // const data = await response;
    console.log("RESPONSE DATA:_", response);
    client = await createChromiaClient(url);
    console.log("useChromiaNode", client);
  });

  return () => client;
}
