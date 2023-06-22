import { Operation, formatter } from "postchain-client";
import { BufferId } from "../../../cryptoUtils";
import { KeyStore } from "../interfaces";

export function ftAuth(
  accountId: BufferId,
  authDesriptorId: BufferId
): Operation {
  return {
    name: "ft.ft_auth",
    args: [
      formatter.ensureBuffer(accountId),
      formatter.ensureBuffer(authDesriptorId),
    ],
  };
}

export interface FtKeystore extends KeyStore {
  pubKey: Buffer;
}
