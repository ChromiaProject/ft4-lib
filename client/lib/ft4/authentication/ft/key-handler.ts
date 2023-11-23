import { Buffer } from "buffer";
import { Operation, SignatureProvider, gtx } from "postchain-client";
import { ftAuth } from ".";
import { AuthDataService, KeyHandler, KeyStore } from "../types";
import {
  aggregateSigners,
  gtv,
  deriveAuthDescriptorId,
  AnyAuthDescriptorRegistration,
  AnyAuthDescriptor,
} from "/ft4/accounts/auth-descriptor";
import { BufferId, TxBuilderTransaction, TxContext } from "/ft4/utils/types";

export function createFtKeyHandler(
  authDescriptor: AnyAuthDescriptor,
  keyStore: FtKeyStore,
): KeyHandler {
  const adId = authDescriptor
    ? deriveAuthDescriptorId(
        gtv.authDescriptorRegistrationToGtv(authDescriptor),
      )
    : undefined;
  return Object.freeze({
    authDescriptor,
    keyStore,
    satisfiesAuthRequirements: (requiredFlags: string[]) =>
      hasAuthDescriptorFlags(authDescriptor, requiredFlags),
    authorize: (
      accountId: BufferId,
      operation: Operation,
      _context: TxContext,
      _authDataService: AuthDataService,
    ) => authorize(accountId, adId, operation),
    sign: (transaction: TxBuilderTransaction) => sign(transaction, keyStore),
    getSigners: () => aggregateSigners(authDescriptor),
  });
}

async function authorize(
  accountId: BufferId,
  authDescriptorId: BufferId | undefined,
  operation: Operation,
): Promise<Operation[]> {
  return [ftAuth(accountId, authDescriptorId), operation];
}

async function sign(
  transaction: TxBuilderTransaction,
  keyStore: FtKeyStore,
): Promise<void> {
  transaction.signatures.push(
    await keyStore.sign(
      gtx.getDigestToSign({
        blockchainRid: transaction.blockchainRid,
        signers: transaction.signers,
        operations: transaction.operations,
      }),
    ),
  );
}

export function hasAuthDescriptorFlags(
  authDescriptor: AnyAuthDescriptor | AnyAuthDescriptorRegistration,
  requiredFlags: string[],
): boolean {
  return requiredFlags.every((flag) =>
    authDescriptor.args.flags.includes(flag),
  );
}

export interface FtKeyStore extends KeyStore, SignatureProvider {
  pubKey: Buffer;
}
