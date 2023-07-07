import { registerOp } from "./account-dev-operations";
import {
  addAuthDescriptor as addAuthDescriptorOp,
  burnOp,
  _burn as _burnOp,
  deleteAllAuthDescriptorsExclude as deleteAllAuthDescriptorsExcludeOp,
  deleteAuthDescriptor as deleteAuthDescriptorOp,
  transfer as transferOp,
} from "./account-operations";
import { LegacyAccount, AuthenticatedAccount } from "./types";
import { createAccountObject, getById } from "./account-query-functions";
import { nop } from "../utils";
import { AuthDescriptor } from "./auth-descriptor/types";
import { BufferId, KeyPair } from "../../cryptoUtils";
import {
  formatter,
  GtxClient,
  SignatureProvider,
  TransactionReceipt,
} from "postchain-client";
import { LegacyTransactionBuilder } from "../utils/transaction-builder-old";
import { Amount } from "../asset/interfaces";
import { Connection } from "../types";
import { createInMemoryFtKeyStore } from "../authentication/ft/key-stores/in-memory";
import { transactionBuilder } from "../utils/transaction-builder";
import { Authenticator } from "../authentication/types";
import { call } from "../ft-session";

export async function deleteAllAuthDescriptorsExclude(
  authDescriptorId: BufferId,
  accountId: BufferId,
  tb: LegacyTransactionBuilder
): Promise<void> {
  const tx = await tb
    .add(
      deleteAllAuthDescriptorsExcludeOp(
        formatter.ensureBuffer(accountId),
        formatter.ensureBuffer(authDescriptorId)
      )
    )
    .add(nop())
    .buildSigned();
  await tx.postAndWaitConfirmation();
}

export async function burnTokens(
  assetId: BufferId,
  amount: Amount,
  tb: LegacyTransactionBuilder
): Promise<void> {
  //if we want to check that amount has the correct decimals, do it here
  const tx = await tb.add(burnOp(assetId, amount)).add(nop()).buildSigned();
  await tx.postAndWaitConfirmation();
}

//-------------------ADMIN OPERATIONS-------------------//

export async function registerAccount(
  session: GtxClient,
  adminSingatureProvider: SignatureProvider,
  newAuthDesc: AuthDescriptor
): Promise<LegacyAccount> {
  const tx = session.newTransaction([adminSingatureProvider.pubKey]);
  const op = registerOp(newAuthDesc);
  tx.addOperation(op.name, ...op.args);
  await tx.sign(adminSingatureProvider);
  await tx.postAndWaitConfirmation();
  return <LegacyAccount>await getById(session, newAuthDesc.id);
}

export async function givePoints(
  client: GtxClient,
  adminSignatureProvider: SignatureProvider,
  accountId: BufferId,
  points: number
) {
  const tx = client.newTransaction([adminSignatureProvider.pubKey]);
  tx.addOperation(
    "ft4.admin.add_rate_limit_points",
    formatter.ensureBuffer(accountId),
    points
  );
  await tx.sign(adminSignatureProvider);
  await tx.postAndWaitConfirmation();
}

export function createAuthenticatedAccount(
  connection: Connection,
  authenticator: Authenticator
): AuthenticatedAccount {
  return {
    authenticator,
    addAuthDescriptor: (
      authDescriptor: AuthDescriptor,
      keyPair: SignatureProvider | KeyPair
    ) => addAuthDescriptor(connection, authenticator, authDescriptor, keyPair),
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
  keyPair: SignatureProvider | KeyPair
): Promise<TransactionReceipt> {
  const tb = transactionBuilder(authenticator, connection.client);

  const tx = await tb
    .add(addAuthDescriptorOp(authDescriptor))
    .addSigners(
      createInMemoryFtKeyStore(keyPair).createKeyHandler(authDescriptor)
    )
    .build();

  return connection.client.sendTransaction(tx);
}

async function deleteAuthDescriptor(
  connection: Connection,
  authenticator: Authenticator,
  authDescriptorId: BufferId
): Promise<TransactionReceipt> {
  return call(
    connection,
    authenticator,
    deleteAuthDescriptorOp(authDescriptorId)
  );
}

async function transfer(
  connection: Connection,
  authenticator: Authenticator,
  receiverId: BufferId,
  assetId: BufferId,
  amount: Amount
): Promise<TransactionReceipt> {
  return call(
    connection,
    authenticator,
    transferOp(receiverId, assetId, amount)
  );
}

async function burn(
  connection: Connection,
  authenticator: Authenticator,
  assetId: BufferId,
  amount: Amount
) {
  return call(connection, authenticator, _burnOp(assetId, amount));
}
