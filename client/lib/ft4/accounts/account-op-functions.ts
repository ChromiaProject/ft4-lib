import { formatter } from "postchain-client";
import { FtKeyStore, createAuthenticator } from "../authentication";
import { Authenticator } from "../authentication/types";
import { call, createSession } from "../ft-session";
import { Connection } from "../types";
import { transactionBuilder } from "@ft4/utils/transaction-builder";
import {
  addAuthDescriptor as addAuthDescriptorOp,
  burn as burnOp,
  deleteAuthDescriptor as deleteAuthDescriptorOp,
  transfer as transferOp,
} from "./account-operations";
import { authDescriptorById } from "./account-queries";
import { createAccountObject } from "./account-query-functions";
import {
  AnyAuthDescriptorRegistration,
  deriveAuthDescriptorId,
  gtv,
} from "./auth-descriptor";
import { AuthenticatedAccount } from "./types";
import {
  BufferId,
  TransactionCompletion,
  TransactionSessionCompletion,
} from "@ft4/utils/types";
import { Amount } from "@ft4/asset";

export function createAuthenticatedAccount(
  connection: Connection,
  authenticator: Authenticator,
): AuthenticatedAccount {
  return Object.freeze({
    authenticator,
    addAuthDescriptor: (
      authDescriptor: AnyAuthDescriptorRegistration,
      keyStore: FtKeyStore,
    ) => addAuthDescriptor(connection, authenticator, authDescriptor, keyStore),
    deleteAuthDescriptor: (authDescriptorId: BufferId) =>
      deleteAuthDescriptor(connection, authenticator, authDescriptorId),
    // deleteAllAuthDescriptorsExclude: (authDescriptorId: BufferId) =>
    //   _deleteAllAuthDescriptorsExclude(connection, authenticator, authDescriptorId),
    transfer: (receiverId: BufferId, assetId: BufferId, amount: Amount) =>
      transfer(connection, authenticator, receiverId, assetId, amount),
    burn: (assetId: BufferId, amount: Amount) =>
      burn(connection, authenticator, assetId, amount),
    ...createAccountObject(connection, authenticator.accountId),
  });
}

async function addAuthDescriptor(
  connection: Connection,
  authenticator: Authenticator,
  authDescriptorRegistration: AnyAuthDescriptorRegistration,
  keyStore: FtKeyStore,
): Promise<TransactionSessionCompletion> {
  const tb = transactionBuilder(authenticator, connection.client);

  const tx = await tb
    .add(addAuthDescriptorOp(authDescriptorRegistration))
    .addSigners(keyStore)
    .build();

  const receipt = await connection.client.sendTransaction(tx);
  const ad = await connection.query(
    authDescriptorById(
      authenticator.accountId,
      deriveAuthDescriptorId(authDescriptorRegistration),
    ),
  );

  const newAuth = createAuthenticator(
    authenticator.accountId,
    authenticator.keyHandlers.concat(
      keyStore.createKeyHandler(gtv.authDescriptorFromGtv(ad)),
    ),
    authenticator.authDataService,
  );

  return {
    receipt,
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
