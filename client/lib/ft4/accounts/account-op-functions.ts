import {
  addAuthDescriptor as addAuthDescriptorOp,
  burn as burnOp,
  deleteAuthDescriptor as deleteAuthDescriptorOp,
  transfer as transferOp,
} from "./account-operations";
import { AuthenticatedAccount } from "./types";
import { createAccountObject } from "./account-query-functions";
import { AuthDescriptor } from "./auth-descriptor/types";
import { BufferId } from "../../cryptoUtils";
import {
  SignatureProvider,
  TransactionReceipt,
  KeyPair,
} from "postchain-client";
import { Amount } from "../asset/interfaces";
import { Connection } from "../types";
import { createInMemoryFtKeyStore } from "../authentication/ft/key-stores/in-memory";
import { transactionBuilder } from "../utils/transaction-builder";
import { Authenticator } from "../authentication/types";
import { call } from "../ft-session";

export function createAuthenticatedAccount(
  connection: Connection,
  authenticator: Authenticator,
): AuthenticatedAccount {
  return {
    authenticator,
    addAuthDescriptor: (
      authDescriptor: AuthDescriptor,
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
  authDescriptor: AuthDescriptor,
  newSigner: SignatureProvider | KeyPair,
): Promise<TransactionReceipt> {
  const tb = transactionBuilder(authenticator, connection.client);

  const tx = await tb
    .add(addAuthDescriptorOp(authDescriptor))
    .addSigners(
      createInMemoryFtKeyStore(newSigner).createKeyHandler(authDescriptor),
    )
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
    undefined,
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
    undefined,
    transferOp(receiverId, assetId, amount),
  );
}

async function burn(
  connection: Connection,
  authenticator: Authenticator,
  assetId: BufferId,
  amount: Amount,
) {
  return call(connection, authenticator, undefined, burnOp(assetId, amount));
}
