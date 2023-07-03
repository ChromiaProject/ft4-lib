import { BufferId } from "../../../cryptoUtils";
import { KeyHandler, KeyStore } from "../types";
import { AuthDescriptor } from "../../accounts/auth-descriptor/types";
import { Operation, SignatureProvider, gtx } from "postchain-client";
import { Buffer } from "buffer";
import { ftAuth } from ".";
import { TxBuilderTransaction } from "/ft4/utils/types";

export function createFtKeyHandler(
  authDescriptor: AuthDescriptor,
  keyStore: FtKeyStore
): KeyHandler {
  return Object.freeze({
    authDescriptor,
    keyStore,
    satisfiesAuthRequirements: (requiredFlags: string[]) =>
      hasAuthDescriptorFlags(authDescriptor, requiredFlags),
    authenticate: (accountId: BufferId, operation: Operation) =>
      authenticate(accountId, authDescriptor.id, operation),
    sign: (transaction: TxBuilderTransaction) => sign(transaction, keyStore),
    getSigners: () => authDescriptor.signers,
  });
}

async function authenticate(
  accountId: BufferId,
  authDescriptorId: BufferId,
  operation: Operation
): Promise<Operation[]> {
  return [ftAuth(accountId, authDescriptorId), operation];
}

async function sign(
  transaction: TxBuilderTransaction,
  keyStore: FtKeyStore
): Promise<void> {
  transaction.signatures.push(
    await keyStore.sign(
      gtx.getDigestToSign({
        blockchainRID: transaction.blockchainRID,
        signers: transaction.signers,
        operations: transaction.operations,
      })
    )
  );
}

export function hasAuthDescriptorFlags(
  authDescriptor: AuthDescriptor,
  requiredFlags: string[]
): boolean {
  return requiredFlags.every((flag) => authDescriptor.flags.has(flag));
}

export interface FtKeyStore extends KeyStore, SignatureProvider {
  pubKey: Buffer;
}
