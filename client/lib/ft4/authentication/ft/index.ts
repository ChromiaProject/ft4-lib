import { Operation, formatter } from "postchain-client";
import { KeyStore } from "../types";
import { Buffer } from "buffer";
import { BufferId } from "@ft4/utils/types";

export function ftAuth(
  accountId: BufferId,
  authDescriptorId: BufferId,
): Operation {
  return {
    name: "ft4.ft_auth",
    args: [
      formatter.ensureBuffer(accountId),
      formatter.ensureBuffer(authDescriptorId),
    ],
  };
}

export interface FtKeyStore extends KeyStore {
  pubKey: Buffer;
}

export { createInMemoryFtKeyStore } from "./key-stores/in-memory";
