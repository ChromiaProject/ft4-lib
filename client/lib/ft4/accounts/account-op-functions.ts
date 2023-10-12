import { KeyPair, SignatureProvider, formatter } from "postchain-client";
import { BufferId } from "../../cryptoUtils";
import { Amount } from "../asset/interfaces";
import { createAuthenticator } from "../authentication";
import { createInMemoryFtKeyStore } from "../authentication/ft/key-stores/in-memory";
import { Authenticator } from "../authentication/types";
import { call, createSession } from "../ft-session";
import { Connection } from "../types";
import { transactionBuilder } from "../utils/transaction-builder";
import {
  addAuthDescriptor as addAuthDescriptorOp,
  burn as burnOp,
  deleteAuthDescriptor as deleteAuthDescriptorOp,
  transfer as transferOp,
} from "./account-operations";
import { createAccountObject } from "./account-query-functions";
import { authDescriptorRegistrationToGtv } from "./auth-descriptor/gtv";
import { AuthenticatedAccount } from "./types";
import {
  TransactionCompletion,
  TransactionSessionCompletion,
} from "../utils/types";
import {
  AnyAuthDescriptorRegistration,
  deriveAccountId,
} from "./auth-descriptor";

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
  authDescriptorRegistration: AnyAuthDescriptorRegistration,
  newSigner: SignatureProvider | KeyPair,
): Promise<TransactionSessionCompletion> {
  const tb = transactionBuilder(authenticator, connection.client);

  const newKeyHandler = createInMemoryFtKeyStore(newSigner).createKeyHandler(
    authDescriptorRegistration,
  );

  const registration = authDescriptorRegistrationToGtv(
    authDescriptorRegistration,
  );
  const tx = await tb
    .add(addAuthDescriptorOp(registration))
    .addSigners(
      createInMemoryFtKeyStore(newSigner).createKeyHandler(
        authDescriptorRegistration,
      ),
    )
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
      deriveAccountId(kh.authDescriptorRegistration).compare(
        formatter.ensureBuffer(authDescriptorId),
      ),
    ),
    authenticator.authDataService,
  );
  return {
    receipt: await call(
      connection,
      authenticator,
      deleteAuthDescriptorOp(authDescriptorId),
    ),
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
  return {
    receipt: await call(
      connection,
      authenticator,
      transferOp(receiverId, assetId, amount),
    ),
  };
}

async function burn(
  connection: Connection,
  authenticator: Authenticator,
  assetId: BufferId,
  amount: Amount,
) {
  return {
    receipt: await call(connection, authenticator, burnOp(assetId, amount)),
  };
}
