import { aggregateSigners } from "@ft4/accounts";
import {
  Authenticator,
  AuthDataService,
  EVM_AUTH,
  EvmKeyStore,
  KeyStore,
  RawSignature,
  isAuthOperation,
  isEvmKeyStore,
  isFtKeyStore,
} from "@ft4/authentication";
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
import { compactArray, MerkleHashVersionSource } from "@ft4/utils";

/**
 * Signs a transaction using an authenticator. This function will add all the necessary missing
 * signatures which the authenticator permits it to. I.e., both evm and ft signatures. For signers
 * which the authenticator does not know how to sign, it will just ignore adding those signatures.
 * It is important to notice however, that if this function is called to add additional evm signatures
 * after ft signatures are added. An error will be thrown. If you want to sign the transactions with
 * keystores instead of with an authenticator, see: {@link signTransactionWithKeyStores}
 *
 * @remarks all evm signatures have to be added before ft signatures can be added. Trying to add
 * evm signatures after ft signatures are added will result in an error.
 *
 * @param authenticator - the authenticator to use when signing the transaction
 * @param tx - the transaction to sign
 * @returns the provided transaction with the appropriate signatures added
 */
export async function signTransaction(
  authenticator: Authenticator,
  tx: GTX | RawGtx | SignedTransaction,
): Promise<SignedTransaction> {
  const gtxTx = ensureCorrectGTX(tx);

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
            maybeEvmSign(
              signer,
              signerIndex,
              authenticator.keyHandlers.map((kh) => kh.keyStore),
              authenticator.authDataService,
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
                  authenticator.authDataService,
                  gtxTx.operations,
                  getOpIndexToAuth(gtxTx.operations, operationIndex),
                );
              }
            }),
          );
        }
      }
      return op;
    }),
  );

  await gtxSign(
    gtxTx,
    authenticator.keyHandlers.map((kh) => kh.keyStore),
    authenticator.authDataService.connection,
  );

  return gtx.serialize(gtxTx);
}

/**
 * Same as {@link signTransaction} but accepts keystores instead of an authenticator. Useful if you need to sign
 * a transaction that e.g., does not have access to auth descriptors. Such as when registering an account.
 * @param keyStores - the keystores to use for signing
 * @param authDataService - an auth data service instance to use when signing the transaction
 * @param tx - the transaction to sign.
 * @returns the signed transaction
 */
export async function signTransactionWithKeyStores(
  keyStores: KeyStore[],
  authDataService: AuthDataService,
  tx: GTX | RawGtx | SignedTransaction,
): Promise<SignedTransaction> {
  const gtxTx = ensureCorrectGTX(tx);

  await Promise.all(
    gtxTx.operations.map(async (op, operationIndex) => {
      if (
        op.opName == EVM_SIGNATURES &&
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
            maybeEvmSign(
              signer,
              signerIndex,
              keyStores,
              authDataService,
              opSignatures,
              gtxTx.operations,
              operationIndex,
            ),
          ),
        );
      }
      return op;
    }),
  );

  await gtxSign(gtxTx, keyStores, authDataService.connection);

  return gtx.serialize(gtxTx);
}

function ensureCorrectGTX(tx: GTX | RawGtx | SignedTransaction): GTX {
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

  return gtxTx;
}

async function evmSign(
  keyStore: EvmKeyStore,
  authDataService: AuthDataService,
  operations: RellOperation[],
  opIndex: number,
): Promise<RawSignature> {
  const op = operations[opIndex];
  const operation = { name: op.opName, args: op.args };
  const authOp = operations[opIndex - 1];
  const authOperation = { name: authOp.opName, args: authOp.args };

  const evmSignaturesOp = await signOperation(
    compactArray([
      isAuthOperation(authOperation) ? authOperation : null,
      operation,
    ]),
    [keyStore],
    authDataService,
  );
  return evmSignaturesOp?.args![1]![0];
}

async function maybeEvmSign(
  signer: Buffer,
  signerIndex: number,
  keyStores: KeyStore[],
  authDataService: AuthDataService,
  signatures: RawSignature[],
  operations: RellOperation[],
  opIndex: number,
): Promise<void> {
  const evmStores = keyStores.filter(isEvmKeyStore);

  const evmStoreIndex = evmStores.findIndex((ks) => ks.address.equals(signer));
  if (evmStoreIndex === -1) return; // No KeyHandler available for this signer
  if (signatures.at(signerIndex) !== null) return; // This signer already signed

  const opToAuthIndex = getOpIndexToAuth(operations, opIndex);
  signatures[signerIndex] = await evmSign(
    evmStores[evmStoreIndex],
    authDataService,
    operations,
    opToAuthIndex,
  );
}

function getOpIndexToAuth(
  operations: RellOperation[],
  currentOpIndex: number,
): number {
  const noOpToAuthError = (
    message = "Transaction contains evm auth operations but no operation to authorize",
  ) => new Error(message);
  let opIndex = currentOpIndex + 1;
  const nextOp = operations.at(currentOpIndex + 1);
  if (!nextOp) {
    throw noOpToAuthError();
  }

  if (isAuthOperation(nextOp)) {
    const nextNextOp = operations.at(currentOpIndex + 2);
    opIndex = currentOpIndex + 2;
    if (!nextNextOp) throw noOpToAuthError();
    if (isAuthOperation(operations.at(opIndex)!)) {
      throw noOpToAuthError(
        "Transaction is malformed. Expected regular operation but got auth operation",
      );
    }
  }

  return opIndex;
}

async function gtxSign(
  gtxTx: GTX,
  keyStores: KeyStore[],
  merkleHashVersionSource: MerkleHashVersionSource,
) {
  const ftKeyStores = keyStores.filter(isFtKeyStore);

  for (let index = 0; index < gtxTx.signers.length; index++) {
    const keyStore = ftKeyStores.find((ks) =>
      ks.pubKey.equals(gtxTx.signers[index]),
    );
    if (keyStore) {
      if (gtxTx.signatures![index].equals(EMPTY_SIGNATURE)) {
        gtxTx.signatures![index] = await keyStore.sign(
          gtxTx,
          merkleHashVersionSource,
        );
      }
    }
  }
}
