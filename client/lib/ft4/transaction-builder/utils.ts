import {
  AuthDataService,
  Signature,
  Signer,
  isEvmKeyStore,
  isEvmSigner,
  toRawSignature,
} from "@ft4/authentication";
import { BufferId } from "@ft4/utils";
import { GTX, Operation, formatter, gtx } from "postchain-client";

export const EMPTY_SIGNATURE = Buffer.alloc(64);

export function txDigest(tx: GTX): Buffer {
  return gtx.getDigestToSign({
    blockchainRid: tx.blockchainRid,
    signers: tx.signers,
    operations: tx.operations,
  });
}

export async function signOperation(
  operation: Operation,
  signers: Signer[],
  authDataService: AuthDataService,
): Promise<Operation | null> {
  const evmSigners = signers.filter(isEvmSigner);
  if (evmSigners.length === 0) return null;

  const message = await authDataService.getAuthMessageTemplate(operation);
  const addresses = evmSigners.map(({ address }) => address);
  const signatures = await Promise.all(
    evmSigners.map((store) =>
      isEvmKeyStore(store) ? store.signMessage(message) : null,
    ),
  );
  return evmSignatures(addresses, signatures);
}

export function evmSignatures(
  signers: BufferId[],
  signatures: (Signature | null)[],
): Operation {
  return {
    name: "ft4.evm_signatures",
    args: [
      signers.map(formatter.ensureBuffer),
      signatures.map((signature) => signature && toRawSignature(signature)),
    ],
  };
}
