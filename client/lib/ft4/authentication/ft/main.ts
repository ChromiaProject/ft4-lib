import { BufferId, Operation, formatter } from "postchain-client";
import { FtKeyStore, FtSigner } from "./types";
import { Signer } from "@ft4/authentication";

export const FT_AUTH = "ft4.ft_auth";

/**
 * Creates an operation object for the `ft4.ft_auth` operation.
 * @param accountId - the account id to authorize for
 * @param authDescriptorId - the auth descriptor to authorize with
 */
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

/**
 * Creates an `FtSigner` instance from the specified pubkey
 * @param pubKey - the pubkey to convert to an `FtSigner`
 */
export function ftSigner(pubKey: BufferId): FtSigner {
  return {
    pubKey: formatter.ensureBuffer(pubKey),
  };
}

/**
 * Type assertion function that checks if the specified signer is an `FtSigner`
 * @param signer - the signer to check
 * @returns true if the specified signer was an `FtSigner`. Else false.
 */
export function isFtSigner(signer: Signer): signer is FtSigner {
  return (signer as FtSigner).pubKey !== undefined;
}

/**
 * Type assertion function that checks if the specified signer is an `FtKeystore`
 * @param keyStore - the signer to check
 * @returns true if the specified signer was an `FtKeystore`. Else, false.
 */
export function isFtKeyStore(keyStore: Signer): keyStore is FtKeyStore {
  return isFtSigner(keyStore) && (keyStore as FtKeyStore).sign !== undefined;
}
