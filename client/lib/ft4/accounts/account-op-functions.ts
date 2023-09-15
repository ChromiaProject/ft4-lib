import {
  KeyPair,
  SignatureProvider,
  TransactionReceipt,
} from "postchain-client";
import { BufferId } from "../../cryptoUtils";
import { Amount } from "../asset/interfaces";
import { createInMemoryFtKeyStore } from "../authentication/ft/key-stores/in-memory";
import { Authenticator } from "../authentication/types";
import { call } from "../ft-session";
import { Connection } from "../types";
import { transactionBuilder } from "../utils/transaction-builder";
import {
  addAuthDescriptor as addAuthDescriptorOp,
  burn as burnOp,
  deleteAuthDescriptor as deleteAuthDescriptorOp,
  transfer as transferOp,
} from "./account-operations";
import { createAccountObject } from "./account-query-functions";
import { AuthenticatedAccount } from "./types";
import { AnyAuthDescriptorRegistration } from "/ft4/accounts/auth-descriptor/types";
import { authDescriptorRegistrationToGtv } from "./auth-descriptor/gtv";

export function createAuthenticatedAccount(
  connection: Connection,
  authenticator: Authenticator,
): AuthenticatedAccount {
  return {
    authenticator,
    addAuthDescriptor: (
      authDescriptor: AnyAuthDescriptorRegistration,
      newSigner: SignatureProvider | KeyPair,
    ) =>
      addAuthDescriptor(connection, authenticator, authDescriptor, newSigner),
    deleteAuthDescriptor: (authDescriptorId: BufferId) =>
      deleteAuthDescriptor(connection, authenticator, authDescriptorId),
    // deleteAllAuthDescriptorsExclude: (authDescriptorId: BufferId) =>
    //   _deleteAllAuthDescriptorsExclude(connection, authenticator, authDescriptorId),
    transfer: (receiverId: BufferId, assetId: BufferId, amount: Amount) =>
      transfer(connection, authenticator, receiverId, assetId, amount),
    burn: (assetId: BufferId, amount: Amount) =>
      burn(connection, authenticator, assetId, amount),
    ...createAccountObject(connection, authenticator.accountId),
  };
}

async function addAuthDescriptor(
  connection: Connection,
  authenticator: Authenticator,
  ad: AnyAuthDescriptorRegistration,
  newSigner: SignatureProvider | KeyPair,
): Promise<TransactionReceipt> {
  const tb = transactionBuilder(authenticator, connection.client);

  const registration = authDescriptorRegistrationToGtv(ad);
  const tx = await tb
    .add(addAuthDescriptorOp(registration))
    .addSigners(createInMemoryFtKeyStore(newSigner).createKeyHandler(ad))
    .build();

  return connection.client.sendTransaction(tx);
}

async function deleteAuthDescriptor(
  connection: Connection,
  authenticator: Authenticator,
  authDescriptorId: BufferId,
): Promise<TransactionReceipt> {
  return call(
    connection,
    authenticator,
    deleteAuthDescriptorOp(authDescriptorId),
  );
}

async function transfer(
  connection: Connection,
  authenticator: Authenticator,
  receiverId: BufferId,
  assetId: BufferId,
  amount: Amount,
): Promise<TransactionReceipt> {
  return call(
    connection,
    authenticator,
    transferOp(receiverId, assetId, amount),
  );
}

async function burn(
  connection: Connection,
  authenticator: Authenticator,
  assetId: BufferId,
  amount: Amount,
) {
  return call(connection, authenticator, burnOp(assetId, amount));
}
