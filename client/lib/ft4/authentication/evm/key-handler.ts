import { AnyAuthDescriptor, aggregateSigners } from "@ft4/accounts";
import {
  AuthDataService,
  KeyHandler,
  KeyHandlerError,
  hasAuthDescriptorFlags,
} from "@ft4/authentication";
import {
  TxContext,
  deriveNonce,
  getAuthDescriptorCounterIdForTxContext,
} from "@ft4/utils";
import { BufferId, GTX, Operation, formatter } from "postchain-client";
import {
  ACCOUNT_ID_PLACEHOLDER,
  AUTH_DESCRIPTOR_ID_PLACEHOLDER,
  BLOCKCHAIN_RID_PLACEHOLDER,
  NONCE_PLACEHOLDER,
  evmAuth,
} from "./main";
import { EvmKeyStore } from "./types";

/**
 * Creates a new instance of a `KeyHandler` which wraps an Evm key.
 * @param authDescriptor - the associated auth descriptor
 * @param keyStore - the keystore that holds the key
 */
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
        authDescriptor,
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
  authDescriptor: AnyAuthDescriptor,
  operation: Operation,
  authDataService: AuthDataService,
  context: TxContext,
  keyStore: EvmKeyStore,
): Promise<Operation[]> {
  const messageTemplate =
    await authDataService.getAuthMessageTemplate(operation);

  const counter = await getAuthDescriptorCounter(
    authDataService,
    accountId,
    authDescriptor.id,
    context,
  );
  /*
   * it's going to be null only if it has no `opCount` rule, AND:
   * - it has expired between the call to `hasExpired` and `authorize`, OR
   * - it's not registered on the chain
   * The second case shouldn't be reachable unless we allow the tx builder
   * to create an auth descriptor and use it in the same transaction.
   */
  if (counter === null) {
    throw new KeyHandlerError(
      "Invalid auth descriptor counter. Was the auth descriptor too close to expiration?",
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
      formatter.toString(formatter.ensureBuffer(authDescriptor.id)),
    )
    .replace(BLOCKCHAIN_RID_PLACEHOLDER, formatter.toString(blockchainRid))
    .replace(
      NONCE_PLACEHOLDER,
      deriveNonce(
        blockchainRid,
        operation,
        counter,
        authDataService.connection,
      ),
    );

  const signers = aggregateSigners(authDescriptor);
  const signatures = await Promise.all(
    signers.map((signer) =>
      signer.equals(keyStore.address) ? keyStore.signMessage(message) : null,
    ),
  );
  return [evmAuth(accountId, authDescriptor.id, signatures), operation];
}

async function getAuthDescriptorCounter(
  authDataService: AuthDataService,
  accountId: BufferId,
  authDescriptorId: BufferId,
  context: TxContext,
) {
  const counterId = getAuthDescriptorCounterIdForTxContext(
    accountId,
    authDescriptorId,
  );
  if (context[counterId] === undefined) {
    context[counterId] = await authDataService.getAuthDescriptorCounter(
      accountId,
      authDescriptorId,
    );
  }

  return context[counterId];
}
