import { formatter } from "postchain-client";
import { BufferId } from "../../../cryptoUtils";
import { Operation } from "../../utils/types";
import { KeyStore } from "../interfaces";
import { Buffer } from "buffer";

export function ftAuth(
  accountId: BufferId,
  authDesriptorId: BufferId
): Operation {
  return [
    "ft.ft_auth",
    formatter.ensureBuffer(accountId),
    formatter.ensureBuffer(authDesriptorId),
  ];
}

export interface FtKeystore extends KeyStore {
  pubKey: Buffer;
}
