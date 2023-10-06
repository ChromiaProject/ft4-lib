import { Buffer } from "buffer";
import { Operation, SignatureProvider, gtx } from "postchain-client";
import { ftAuth } from ".";
import { BufferId } from "../../../cryptoUtils";
import { AuthDataService, KeyHandler, KeyStore } from "../types";
import {
  aggregateSigners,
  gtv,
  deriveAccountId,
  AnyAuthDescriptorRegistration,
  AnyAuthDescriptor,
} from "/ft4/accounts/auth-descriptor";
import { TxBuilderTransaction } from "/ft4/utils/types";

export function createFtKeyHandler(
  authDescriptorRegistration: AnyAuthDescriptorRegistration,
  keyStore: FtKeyStore,
): KeyHandler {
  const adId = deriveAccountId(
    gtv.authDescriptorRegistrationToGtv(authDescriptorRegistration),
  );
  return Object.freeze({
    authDescriptorRegistration,
    keyStore,
    satisfiesAuthRequirements: (requiredFlags: string[]) =>
      hasAuthDescriptorFlags(authDescriptorRegistration, requiredFlags),
    authorize: (
      accountId: BufferId,
      operation: Operation,
      //eslint-disable-next-line @typescript-eslint/no-unused-vars
      nonce: number,
      //eslint-disable-next-line @typescript-eslint/no-unused-vars
      authDataService: AuthDataService,
    ) => authorize(accountId, adId, operation),
    sign: (transaction: TxBuilderTransaction) => sign(transaction, keyStore),
    getSigners: () => aggregateSigners(authDescriptorRegistration),
  });
}

async function authorize(
  accountId: BufferId,
  authDescriptorId: BufferId,
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
