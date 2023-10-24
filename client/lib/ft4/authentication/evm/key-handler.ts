import { BufferId } from "../../../cryptoUtils";
import { AuthDataService, KeyHandler, KeyStore } from "../types";
import { AuthDescriptor } from "../../accounts/auth-descriptor/types";
import { EvmKeyStore, evmAuth } from ".";
import { hasAuthDescriptorFlags } from "../ft/key-handler";
import { formatter, Operation } from "postchain-client";
import { TxBuilderTransaction } from "/ft4/utils/types";

const getNonceId = (accountId: BufferId, authDescriptorId: BufferId) =>
  accountId.toString("hex") + authDescriptorId.toString("hex");

export function createEvmKeyHandler(
  authDescriptor: AuthDescriptor,
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
      context: any,
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
    sign: (transaction: TxBuilderTransaction) => sign(transaction, keyStore),
    getSigners: () => null,
  });
}

async function authorize(
  accountId: BufferId,
  authDescriptorId: BufferId,
  operation: Operation,
  authDataService: AuthDataService,
  context: { [key: string]: { [key: string]: any } },
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

  console.log(nonce);
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
  context: any,
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

  const cachedNonce = evmContext.nonce[getNonceId(accountId, authDescriptorId)];
  if (cachedNonce !== 0 && !cachedNonce) {
    const nonce = await authDataService.getNonce(accountId, authDescriptorId);
    evmContext.nonce[getNonceId(accountId, authDescriptorId)] = nonce;
  } else {
    evmContext.nonce[getNonceId(accountId, authDescriptorId)] += 1;
  }

  return evmContext.nonce[getNonceId(accountId, authDescriptorId)];
}
