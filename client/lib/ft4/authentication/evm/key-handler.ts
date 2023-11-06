import { Operation, formatter } from "postchain-client";
import { EvmKeyStore, evmAuth } from ".";
import { BufferId } from "../../../cryptoUtils";
import { hasAuthDescriptorFlags } from "../ft/key-handler";
import { AuthDataService, KeyHandler, KeyStore } from "../types";
import { AnyAuthDescriptorRegistration } from "/ft4/accounts/auth-descriptor/types";
import { gtv, deriveAccountId } from "/ft4/accounts/auth-descriptor";
import { TxContext, TxBuilderTransaction } from "/ft4/utils/types";

const getNonceId = (accountId: BufferId, authDescriptorId: BufferId) =>
  accountId.toString("hex") + authDescriptorId.toString("hex");

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
      context: TxContext,
      authDataService: AuthDataService,
    ) =>
      authorize(
        accountId,
        deriveAccountId(
          gtv.authDescriptorRegistrationToGtv(authDescriptorRegistration),
        ),
        operation,
        authDataService,
        context,
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
  authDataService: AuthDataService,
  context: TxContext,
  keyStore: EvmKeyStore,
): Promise<Operation[]> {
  const messageTemplate = await authDataService.getAuthMessageTemplate(
    operation,
  );
  const nonce = await getNonce(
    authDataService,
    accountId,
    authDescriptorId,
    context,
  );

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
): Promise<void> {}
/* eslint-enable */

async function getNonce(
  authDataService: AuthDataService,
  accountId: BufferId,
  authDescriptorId: BufferId,
  context: TxContext,
) {
  let evmContext = context["evm"];
  if (!evmContext) {
    evmContext = {
      nonce: {},
    };

    context["evm"] = evmContext;
  } else if (!evmContext.nonce) {
    evmContext["nonce"] = {};
  }

  const nonceId = getNonceId(accountId, authDescriptorId);
  const cachedNonce = evmContext.nonce[nonceId];
  if (cachedNonce !== 0 && !cachedNonce) {
    const nonce = await authDataService.getNonce(accountId, authDescriptorId);
    evmContext.nonce[nonceId] = nonce;
  } else {
    evmContext.nonce[nonceId] += 1;
  }

  return evmContext.nonce[nonceId];
}
