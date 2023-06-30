import { Operation, formatter } from "postchain-client";
import { BufferId } from "../../../cryptoUtils";
import { KeyStore } from "../types";
import { Buffer } from "buffer";

export function ftAuth(
  accountId: BufferId,
  authDesriptorId: BufferId
): Operation {
  return {
    name: "ft4.ft_auth",
    args: [
      formatter.ensureBuffer(accountId),
      formatter.ensureBuffer(authDesriptorId),
    ],
  };
}

export interface FTKeyStore extends KeyStore {
  pubKey: Buffer;
}
