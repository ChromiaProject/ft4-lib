import { BufferId } from "../../../cryptoUtils";
import { AuthDataService, KeyHandler, KeyStore } from "../types";
import { AuthDescriptor } from "../../accounts/auth-descriptor/types";
import { EvmKeyStore, evmAuth } from ".";
import { hasAuthDescriptorFlags } from "../ft/key-handler";
import { formatter, Operation } from "postchain-client";
import { TxBuilderTransaction } from "/ft4/utils/types";

type NonceData = {
  nonce: number;
  accountId: BufferId;
  authDescriptorId: BufferId;
  keyStoreId: Buffer;
};

export const noncesByAccountAndAdId: { [key: string]: NonceData } = {};
export const noncesByKeystoreId: { [key: string]: NonceData } = {};

const getNonceId = (v1: BufferId, v2: BufferId) =>
  v1.toString("hex") + v2.toString("hex");

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
      authDataService: AuthDataService,
    ) =>
      authorize(
        accountId,
        authDescriptor.id,
        operation,
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
  authDataService: AuthDataService,
  keyStore: EvmKeyStore,
): Promise<Operation[]> {
  const messageTemplate =
    await authDataService.getAuthMessageTemplate(operation);
  const nonce = await getNonce(
    authDataService,
    accountId,
    authDescriptorId,
    keyStore,
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
): Promise<void> {
  const nonceData = noncesByKeystoreId[keyStore.id.toString("hex")];
  if (nonceData) {
    delete noncesByKeystoreId[keyStore.id.toString("hex")];
    delete noncesByAccountAndAdId[
      getNonceId(nonceData.accountId, nonceData.authDescriptorId)
    ];
  }
}
/* eslint-enable */

async function getNonce(
  authDataService: AuthDataService,
  accountId: BufferId,
  authDescriptorId: BufferId,
  keyStore: KeyStore,
) {
  const nonce = await authDataService.getNonce(accountId, authDescriptorId);
  const cachedNonceData =
    noncesByAccountAndAdId[getNonceId(accountId, authDescriptorId)];

  if (!cachedNonceData || nonce > cachedNonceData.nonce) {
    noncesByAccountAndAdId[getNonceId(accountId, authDescriptorId)] = {
      nonce,
      accountId,
      authDescriptorId,
      keyStoreId: keyStore.id,
    };
    noncesByKeystoreId[keyStore.id.toString("hex")] = {
      nonce,
      accountId,
      authDescriptorId,
      keyStoreId: keyStore.id,
    };
  } else {
    noncesByAccountAndAdId[getNonceId(accountId, authDescriptorId)].nonce += 1;
    noncesByKeystoreId[keyStore.id.toString("hex")].nonce += 1;
  }
  return noncesByAccountAndAdId[getNonceId(accountId, authDescriptorId)].nonce;
}
