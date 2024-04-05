import { AnyAuthDescriptor } from "@ft4/accounts";
import {
  AuthDataService,
  KeyHandler,
  KeyHandlerError,
  hasAuthDescriptorFlags,
} from "@ft4/authentication";
import { BufferId, TxContext, getNonceIdForTxContext } from "@ft4/utils";
import { GTX, Operation, formatter } from "postchain-client";
import {
  ACCOUNT_ID_PLACEHOLDER,
  AUTH_DESCRIPTOR_ID_PLACEHOLDER,
  BLOCKCHAIN_RID_PLACEHOLDER,
  NONCE_PLACEHOLDER,
  evmAuth,
} from "./main";
import { EvmKeyStore } from "./types";

export function createEvmKeyHandler(
  authDescriptor: AnyAuthDescriptor,
  keyStore: EvmKeyStore,
): KeyHandler {
  return Object.freeze({
    authDescriptor,
    keyStore,
    satisfiesAuthRequirements: (requiredFlags: string[]) =>
      hasAuthDescriptorFlags(authDescriptor, requiredFlags),
    authorize: (
      accountId: BufferId,
      operation: Operation,
      context: TxContext,
      authDataService: AuthDataService,
    ) =>
      authorize(
        accountId,
        authDescriptor.id,
        operation,
        authDataService,
        context,
        keyStore,
      ),
    sign: (_transaction: GTX) =>
      Promise.reject("Cannot sign the transaction with an EVM key store"),
    getSigners: () => [],
  });
}

async function authorize(
  accountId: BufferId,
  authDescriptorId: BufferId,
  operation: Operation,
  authDataService: AuthDataService,
  context: TxContext,
  keyStore: EvmKeyStore,
): Promise<Operation[]> {
  const messageTemplate =
    await authDataService.getAuthMessageTemplate(operation);

  const nonce = await getNonce(
    authDataService,
    accountId,
    authDescriptorId,
    context,
  );
  /*
   * it's going to be null only if it has no `opCount` rule, AND:
   * - it has expired between the call to `hasExpired` and `authorize`, OR
   * - it's not registered on the chain
   * The second case shouldn't be reachable unless we allow the tx builder
   * to create an auth descriptor and use it in the same transaction.
   */
  if (nonce === null) {
    throw new KeyHandlerError(
      "Invalid nonce. Was the auth descriptor too close to expiration?",
    );
  }

  const blockchainRid = authDataService.getBlockchainRid();
  const message = messageTemplate
    .replace(
      ACCOUNT_ID_PLACEHOLDER,
      formatter.toString(formatter.ensureBuffer(accountId)),
    )
    .replace(
      AUTH_DESCRIPTOR_ID_PLACEHOLDER,
      formatter.toString(formatter.ensureBuffer(authDescriptorId)),
    )
    .replace(BLOCKCHAIN_RID_PLACEHOLDER, formatter.toString(blockchainRid))
    .replace(NONCE_PLACEHOLDER, `${nonce}`);

  const signature = await keyStore.signMessage(message);
  return [evmAuth(accountId, authDescriptorId, [signature]), operation];
}

async function getNonce(
  authDataService: AuthDataService,
  accountId: BufferId,
  authDescriptorId: BufferId,
  context: TxContext,
) {
  const nonceId = getNonceIdForTxContext(accountId, authDescriptorId);
  if (context[nonceId] === undefined) {
    context[nonceId] = await authDataService.getNonce(
      accountId,
      authDescriptorId,
    );
  }

  return context[nonceId];
}
