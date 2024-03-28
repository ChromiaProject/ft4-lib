import { BufferId } from "@ft4/utils";
import { Operation, formatter } from "postchain-client";
import { FtKeyStore } from "./types";
import { KeyStore } from "@ft4/authentication";

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

export function isFtKeyStore(keyStore: KeyStore): keyStore is FtKeyStore {
  return (keyStore as FtKeyStore).pubKey !== undefined;
}
