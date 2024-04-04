import { Amount } from "@ft4/asset";
import {
  Authenticator,
  KeyStore,
  createAuthenticator,
} from "@ft4/authentication";
import {
  BufferId,
  TransactionCompletion,
  TransactionSessionCompletion,
} from "@ft4/utils";
import { formatter } from "postchain-client";
import { transactionBuilder } from "@ft4/transaction-builder";
import {
  addAuthDescriptor as addAuthDescriptorOp,
  burn as burnOp,
  deleteAuthDescriptor as deleteAuthDescriptorOp,
  transfer as transferOp,
} from "./operations";
import { authDescriptorById } from "./queries";
import { createAccountObject } from "./query-functions";
import {
  AnyAuthDescriptorRegistration,
  deriveAuthDescriptorId,
  gtv,
} from "./auth-descriptor";
import { AuthenticatedAccount } from "./types";
import {
  PendingTransfer,
  crosschainTransfer,
  resumeCrosschainTransfer,
} from "@ft4/crosschain";
import { Connection, call, createSession } from "@ft4/ft-session";

export function createAuthenticatedAccount(
  connection: Connection,
  authenticator: Authenticator,
): AuthenticatedAccount {
  return Object.freeze({
    authenticator,
    addAuthDescriptor: (
      authDescriptor: AnyAuthDescriptorRegistration,
      keyStore: KeyStore,
    ) => addAuthDescriptor(connection, authenticator, authDescriptor, keyStore),
    deleteAuthDescriptor: (authDescriptorId: BufferId) =>
      deleteAuthDescriptor(connection, authenticator, authDescriptorId),
    // deleteAllAuthDescriptorsExclude: (authDescriptorId: BufferId) =>
    //   _deleteAllAuthDescriptorsExclude(connection, authenticator, authDescriptorId),
    transfer: (receiverId: BufferId, assetId: BufferId, amount: Amount) =>
      transfer(connection, authenticator, receiverId, assetId, amount),
    crosschainTransfer: (
      targetChainId: BufferId,
      recipientId: BufferId,
      assetId: BufferId,
      amount: Amount,
    ) =>
      crosschainTransfer(
        connection,
        authenticator,
        targetChainId,
        recipientId,
        assetId,
        amount,
      ),
    resumeCrosschainTransfer: (pendingTransfer: PendingTransfer) =>
      resumeCrosschainTransfer(connection, authenticator, pendingTransfer),
    burn: (assetId: BufferId, amount: Amount) =>
      burn(connection, authenticator, assetId, amount),
    ...createAccountObject(connection, authenticator.accountId),
  });
}

async function addAuthDescriptor(
  connection: Connection,
  authenticator: Authenticator,
  authDescriptorRegistration: AnyAuthDescriptorRegistration,
  keyStore: KeyStore,
): Promise<TransactionSessionCompletion> {
  const tb = transactionBuilder(authenticator, connection.client);

  const tx = await tb
    .add(addAuthDescriptorOp(authDescriptorRegistration), {
      signers: [keyStore],
    })
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
