import { Operation, formatter } from "postchain-client";
import { EvmKeyStore, evmAuth } from ".";
import { hasAuthDescriptorFlags } from "../ft/key-handler";
import { AuthDataService, KeyHandler } from "../types";
import { deriveAuthDescriptorId } from "/ft4/accounts/auth-descriptor";
import { AnyAuthDescriptor } from "/ft4/accounts/auth-descriptor/types";
import { BufferId, TxContext } from "/ft4/utils/types";

const getNonceId = (accountId: BufferId, authDescriptorId: BufferId) =>
  accountId.toString("hex") + authDescriptorId.toString("hex");

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
        deriveAuthDescriptorId(authDescriptor),
        operation,
        authDataService,
        context,
        keyStore,
      ),
    sign: (transaction: Buffer) => Promise.resolve(transaction),
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
  const messageTemplate =
    await authDataService.getAuthMessageTemplate(operation);
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
