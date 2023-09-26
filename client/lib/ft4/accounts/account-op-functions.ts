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
import { SignatureProvider, KeyPair, formatter } from "postchain-client";
import { Amount } from "../asset/interfaces";
import { Connection } from "../types";
import { createInMemoryFtKeyStore } from "../authentication/ft/key-stores/in-memory";
import { transactionBuilder } from "../utils/transaction-builder";
import { Authenticator } from "../authentication/types";
import { call, createSession } from "../ft-session";
import { createAuthenticator } from "../authentication";
import {
  TransactionCompletion,
  TransactionSessionCompletion,
} from "../utils/types";

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
): Promise<TransactionSessionCompletion> {
  const tb = transactionBuilder(authenticator, connection.client);

  const newKeyHandler =
    createInMemoryFtKeyStore(newSigner).createKeyHandler(authDescriptor);

  const tx = await tb
    .add(addAuthDescriptorOp(authDescriptor))
    .addSigners(newKeyHandler)
    .build();

  const newAuth = createAuthenticator(
    authenticator.accountId,
    authenticator.keyHandlers.concat(newKeyHandler),
    authenticator.authDataService,
  );

  return {
    receipt: await connection.client.sendTransaction(tx),
    session: createSession(connection, newAuth),
  };
}

async function deleteAuthDescriptor(
  connection: Connection,
  authenticator: Authenticator,
  authDescriptorId: BufferId,
): Promise<TransactionSessionCompletion> {
  const newAuth = createAuthenticator(
    authenticator.accountId,
    authenticator.keyHandlers.filter((kh) =>
      kh.authDescriptor.id.compare(formatter.ensureBuffer(authDescriptorId)),
    ),
    authenticator.authDataService,
  );
  const { receipt } = await call(
    connection,
    authenticator,
    deleteAuthDescriptorOp(authDescriptorId),
  );
  return {
    receipt,
    session: createSession(connection, newAuth),
  };
}

async function transfer(
  connection: Connection,
  authenticator: Authenticator,
  receiverId: BufferId,
  assetId: BufferId,
  amount: Amount,
): Promise<TransactionCompletion> {
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
