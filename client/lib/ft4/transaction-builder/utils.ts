import { Buffer } from "buffer";
import {
  ACCOUNT_ID_PLACEHOLDER,
  AUTH_DESCRIPTOR_ID_PLACEHOLDER,
  AuthDataService,
  BLOCKCHAIN_RID_PLACEHOLDER,
  NONCE_PLACEHOLDER,
  Signature,
  Signer,
  isAuthOperation,
  isEvmKeyStore,
  isEvmSigner,
  toRawSignature,
} from "@ft4/authentication";
import { deriveNonce } from "@ft4/utils";
import { BufferId, GTX, Operation, formatter, gtx } from "postchain-client";
import { MERKLE_HASH_VERSIONS } from "@ft4/utils/main";

export const EMPTY_SIGNATURE = Buffer.alloc(64);
export const EVM_SIGNATURES = "ft4.evm_signatures";

export function txDigest(tx: GTX): Buffer {
  return gtx.getDigestToSign(
    {
      blockchainRid: tx.blockchainRid,
      signers: tx.signers,
      operations: tx.operations,
    },
    MERKLE_HASH_VERSIONS.ONE,
  );
}

export async function signOperation(
  operations: Operation[],
  signers: Signer[],
  authDataService: AuthDataService,
): Promise<Operation | null> {
  const evmSigners = signers.filter(isEvmSigner);
  if (evmSigners.length === 0) return null;

  let authOperation: Operation | null = null;
  let operationToAuthorize: Operation;

  switch (operations.length) {
    case 0:
      throw new Error(
        "evm_signatures authorization failed: no operation found",
      );
    case 1:
      operationToAuthorize = operations[0];
      break;
    case 2:
      authOperation = operations[0];
      operationToAuthorize = operations[1];
      break;
    default:
      throw new Error(
        `evm_signatures authorization failed: unexpected number of operations found <${operations.length}>`,
      );
  }

  const messageTemplate =
    await authDataService.getAuthMessageTemplate(operationToAuthorize);

  const blockchainRid = authDataService.getBlockchainRid();
  let message = messageTemplate
    .replace(BLOCKCHAIN_RID_PLACEHOLDER, formatter.toString(blockchainRid))
    .replace(
      NONCE_PLACEHOLDER,
      deriveNonce(blockchainRid, operationToAuthorize, 0),
    );

  if (
    messageTemplate.includes(ACCOUNT_ID_PLACEHOLDER) ||
    messageTemplate.includes(AUTH_DESCRIPTOR_ID_PLACEHOLDER)
  ) {
    if (authOperation === null) {
      throw new Error(
        `evm_signatures authorization failed: found '${ACCOUNT_ID_PLACEHOLDER}' or '${AUTH_DESCRIPTOR_ID_PLACEHOLDER}' in auth message template, but didn't find auth operation`,
      );
    }

    const { accountId, authDescriptorId } =
      getAuthDetailsFromAuthOperation(authOperation);

    message = message
      .replace(ACCOUNT_ID_PLACEHOLDER, formatter.toString(accountId))
      .replace(
        AUTH_DESCRIPTOR_ID_PLACEHOLDER,
        formatter.toString(authDescriptorId),
      );
  }

  const addresses = evmSigners.map(({ address }) => address);
  const signatures = await Promise.all(
    evmSigners.map((store) =>
      isEvmKeyStore(store) ? store.signMessage(message) : null,
    ),
  );
  return evmSignatures(addresses, signatures);
}

/**
 * Creates an `evm_signatures` operation from the specified information
 * @param signers - the signers to include
 * @param signatures - the signatures to include
 */
export function evmSignatures(
  signers: BufferId[],
  signatures: (Signature | null)[],
): Operation {
  return {
    name: EVM_SIGNATURES,
    args: [
      signers.map(formatter.ensureBuffer),
      signatures.map((signature) =>
        signature ? toRawSignature(signature) : null,
      ),
    ],
  };
}

function getAuthDetailsFromAuthOperation(operation: Operation): {
  accountId: Buffer;
  authDescriptorId: Buffer;
} {
  if (!isAuthOperation(operation)) {
    throw new Error("Cannot extract auth details. Auth operation not found");
  }

  return {
    accountId: operation.args![0] as Buffer,
    authDescriptorId: operation.args![1] as Buffer,
  };
}
