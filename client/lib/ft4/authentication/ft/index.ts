import { Operation, formatter } from "postchain-client";
import { BufferId } from "../../../cryptoUtils";
import { KeyStore } from "../types";
import { Buffer } from "buffer";

export function ftAuth(
  accountId: BufferId,
  authDescriptorId: BufferId
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
