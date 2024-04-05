import { BufferId } from "@ft4/utils";
import { Operation, formatter } from "postchain-client";
import { FtKeyStore, FtSigner } from "./types";
import { Signer } from "@ft4/authentication";

export const FT_AUTH = "ft4.ft_auth";

export function ftAuth(
  accountId: BufferId,
  authDescriptorId: BufferId,
): Operation {
  return {
    name: FT_AUTH,
    args: [
      formatter.ensureBuffer(accountId),
      formatter.ensureBuffer(authDescriptorId),
    ],
  };
}

export function ftSigner(pubKey: BufferId): FtSigner {
  return {
    pubKey: formatter.ensureBuffer(pubKey),
  };
}

export function isFtSigner(signer: Signer): signer is FtSigner {
  return (signer as FtSigner).pubKey !== undefined;
}

export function isFtKeyStore(keyStore: Signer): keyStore is FtKeyStore {
  return isFtSigner(keyStore) && (keyStore as FtKeyStore).sign !== undefined;
}
