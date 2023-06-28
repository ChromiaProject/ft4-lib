import { formatter } from "postchain-client";
import { BufferId } from "../../../cryptoUtils";
import { Operation } from "../../utils/types";
import { KeyStore } from "../types";
import { Buffer } from "buffer";

export function ftAuth(
  accountId: BufferId,
  authDesriptorId: BufferId
): Operation {
  return [
    "ft4.ft_auth",
    formatter.ensureBuffer(accountId),
    formatter.ensureBuffer(authDesriptorId),
  ];
}

export interface FTKeyStore extends KeyStore {
  pubKey: Buffer;
}
