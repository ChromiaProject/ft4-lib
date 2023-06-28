import { BufferId } from "../../../cryptoUtils";
import { KeyHandler, KeyStore } from "../interfaces";
import { AuthDescriptor } from "../../account/auth-descriptor/types";
import { Operation, SignatureProvider, gtx } from "postchain-client";
import { ftAuth } from ".";
import { TxBuilderTransaction } from "/ft3/utils/types";

export function createFTKeyHandler(
  authDescriptor: AuthDescriptor,
  keyStore: FTKeyStore
): KeyHandler {
  return Object.freeze({
    authDescriptor,
    keyStore,
    satisfiesAuthRequirements: (requiredFlags: string[]) =>
      satisfiesAuthRequirements(authDescriptor, requiredFlags),
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
  keyStore: FTKeyStore
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

export function satisfiesAuthRequirements(
  authDescriptor: AuthDescriptor,
  requiredFlags: string[]
): boolean {
  return requiredFlags.every((flag) => authDescriptor.flags.has(flag));
}

export interface FTKeyStore extends KeyStore, SignatureProvider {
  pubKey: Buffer;
}
