import { aggregateSigners } from "@ft4/accounts";
import {
  Authenticator,
  EVM_AUTH,
  EvmKeyStore,
  RawSignature,
  isEvmKeyStore,
  isFtKeyStore,
} from "@ft4/authentication";
import { Connection } from "@ft4/ft-session";
import { EMPTY_SIGNATURE } from "@ft4/transaction-builder";
import { Buffer } from "buffer";
import {
  GTX,
  RawGtx,
  RellOperation,
  SignedTransaction,
  formatter,
  gtx,
} from "postchain-client";
import { EVM_SIGNATURES, signOperation } from "./utils";

export async function signTransaction(
  _connection: Connection,
  authenticator: Authenticator,
  tx: GTX | RawGtx | SignedTransaction,
): Promise<SignedTransaction> {
  const gtxTx = Buffer.isBuffer(tx)
    ? gtx.deserialize(tx)
    : Array.isArray(tx)
      ? formatter.rawGtxToGtx(tx)
      : tx;

  if (!Array.isArray(gtxTx.signatures)) {
    throw new Error("No signatures array");
  }

  if (gtxTx.signatures.length != gtxTx.signers.length) {
    throw new Error(
      `signatures.length != signers.length: ${gtxTx.signatures.length} != ${gtxTx.signers.length}`,
    );
  }

  await Promise.all(
    gtxTx.operations.map(async (op, operationIndex) => {
      if (
        [EVM_SIGNATURES, EVM_AUTH].includes(op.opName) &&
        gtxTx.signatures!.length > 0 &&
        gtxTx.signatures!.some((sig) => !sig.equals(EMPTY_SIGNATURE))
      ) {
        throw new Error(
          "Cannot add EVM signatures after GTX signature has been added",
        );
      }

      if (op.opName === EVM_SIGNATURES) {
        const opSigners = op.args[0] as Buffer[];
        const opSignatures = op.args[1] as RawSignature[];

        if (opSigners.length !== opSignatures.length) {
          throw new Error(
            "Signatures array need to be sparse array of same length as signers array",
          );
        }

        await Promise.all(
          opSigners.map((signer, signerIndex) =>
            maybeSign(
              signer,
              signerIndex,
              authenticator,
              opSignatures,
              gtxTx.operations,
              operationIndex,
            ),
          ),
        );
      } else if (op.opName === EVM_AUTH) {
        const adId = op.args[1] as Buffer;
        const signatures = op.args[2] as RawSignature[];
        const kh = authenticator.keyHandlers.find((kh) =>
          kh.authDescriptor.id.equals(adId),
        );
        if (kh) {
          // There is a KeyHandler in this authenticator that can sign this operation
          const ad = kh.authDescriptor;
          await Promise.all(
            aggregateSigners(ad).map(async (signer, signerIndex) => {
              if (signer.equals(kh.keyStore.id)) {
                signatures[signerIndex] = await evmSign(
                  kh.keyStore as EvmKeyStore,
                  authenticator,
                  getOpToAuth(gtxTx.operations, operationIndex),
                );
              }
            }),
          );
        }
      }
      return op;
    }),
  );

  for (let index = 0; index < gtxTx.signers.length; index++) {
    const keyHandler = authenticator.keyHandlers.find(
      (kh) =>
        isFtKeyStore(kh.keyStore) &&
        kh.keyStore.pubKey.equals(gtxTx.signers[index]),
    );
    if (keyHandler) {
      if (gtxTx.signatures![index].equals(EMPTY_SIGNATURE)) {
        gtxTx.signatures![index] = await keyHandler.sign(gtxTx);
      }
    }
  }

  return gtx.serialize(gtxTx);
}

async function evmSign(
  keyStore: EvmKeyStore,
  authenticator: Authenticator,
  op: RellOperation,
): Promise<RawSignature> {
  const operation = { name: op.opName, args: op.args };
  const evmSignaturesOp = await signOperation(
    [operation],
    [keyStore],
    authenticator.authDataService,
  );
  return evmSignaturesOp?.args![1]![0];
}

async function maybeSign(
  signer: Buffer,
  signerIndex: number,
  authenticator: Authenticator,
  signatures: RawSignature[],
  operations: RellOperation[],
  opIndex: number,
): Promise<void> {
  const evmStores: EvmKeyStore[] = authenticator.keyHandlers
    .filter((kh) => isEvmKeyStore(kh.keyStore))
    .map((kh) => kh.keyStore) as EvmKeyStore[];

  const keyHandlerIndex = evmStores.findIndex((kh) =>
    kh.address.equals(signer),
  );
  if (keyHandlerIndex === -1) return; // No KeyHandler available for this signer
  if (signatures.at(signerIndex) !== null) return; // This signer already signed

  const opToAuth = getOpToAuth(operations, opIndex);
  signatures[signerIndex] = await evmSign(
    evmStores[keyHandlerIndex],
    authenticator,
    opToAuth,
  );
}

function getOpToAuth(operations: RellOperation[], currentOpIndex: number) {
  const noOpToAuthError = new Error(
    "Transaction contains evm auth operations but no operation to authorize",
  );
  const nextOp = operations.at(currentOpIndex + 1);
  if (!nextOp) {
    throw noOpToAuthError;
  }

  if (nextOp.opName === EVM_AUTH) {
    const nextNextOp = operations.at(currentOpIndex + 2);
    if (nextNextOp) return nextNextOp;
    throw noOpToAuthError;
  }

  return nextOp;
}
