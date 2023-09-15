import { Operation, formatter } from "postchain-client";
import { EvmKeyStore, evmAuth } from ".";
import { BufferId } from "../../../cryptoUtils";
import { hasAuthDescriptorFlags } from "../ft/key-handler";
import { AuthDataService, KeyHandler, KeyStore } from "../types";
import { AnyAuthDescriptorRegistration } from "/ft4/accounts/auth-descriptor/types";
import { TxBuilderTransaction } from "/ft4/utils/types";
import { gtv, deriveAccountId } from "/ft4/accounts/auth-descriptor";

export function createEvmKeyHandler(
  authDescriptorRegistration: AnyAuthDescriptorRegistration,
  keyStore: EvmKeyStore,
): KeyHandler {
  return Object.freeze({
    authDescriptorRegistration,
    keyStore,
    satisfiesAuthRequirements: (requiredFlags: string[]) =>
      hasAuthDescriptorFlags(authDescriptorRegistration, requiredFlags),
    authorize: (
      accountId: BufferId,
      operation: Operation,
      nonce: number,
      authDataService: AuthDataService,
    ) =>
      authorize(
        accountId,
        deriveAccountId(
          gtv.authDescriptorRegistrationToGtv(authDescriptorRegistration),
        ),
        operation,
        nonce,
        authDataService,
        keyStore,
      ),
    sign: (transaction: TxBuilderTransaction) => sign(transaction, keyStore),
    getSigners: () => null,
  });
}

async function authorize(
  accountId: BufferId,
  authDescriptorId: BufferId,
  operation: Operation,
  nonce: number,
  authDataService: AuthDataService,
  keyStore: EvmKeyStore,
): Promise<Operation[]> {
  const messageTemplate =
    await authDataService.getAuthMessageTemplate(operation);
  const brid = authDataService.getBrid();
  const message = messageTemplate
    .replace("{account_id}", formatter.ensureBuffer(accountId).toString("hex"))
    .replace(
      "{auth_descriptor_id}",
      formatter.ensureBuffer(authDescriptorId).toString("hex"),
    )
    .replace("{brid}", brid.toString("hex"))
    .replace("{nonce}", `${nonce}`);

  const signature = await keyStore.signMessage(message);
  return [evmAuth(accountId, authDescriptorId, [signature]), operation];
}

/* eslint-disable */
async function sign(
  transaction: TxBuilderTransaction,
  keyStore: KeyStore,
): Promise<void> {
  // return transaction.sign(keyStore);
}
/* eslint-enable */
