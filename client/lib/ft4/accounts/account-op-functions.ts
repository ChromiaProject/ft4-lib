import { addRateLimitPointsOp, registerOp } from "./account-dev-operations";
import {
  addAuthDescriptor,
  burnOp,
  _burn as _burnOp,
  deleteAllAuthDescriptorsExclude as deleteAllAuthDescriptorsExcludeOp,
  deleteAuthDescriptorOp,
  deleteAuthDescriptor,
  transfer,
} from "./account-operations";
import { Account, User, IAuthenticatedAccount } from "./types";
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
import { Buffer } from "buffer";

export async function ssoRawTransactionRegister(
  newAuthDesc: AuthDescriptor,
  authDescriptor: AuthDescriptor,
  tb: LegacyTransactionBuilder
): Promise<Buffer> {
  const adId = authDescriptor.id;
  const tx = await tb
    .add(registerOp(authDescriptor))
    .add(
      addAuthDescriptorOp(
        deriveAccountId(toGtv(authDescriptor)),
        adId,
        newAuthDesc
      )
    )
    .buildSigned([...authDescriptor.signers, ...newAuthDesc.signers]);
  return tx.encode();
}

export async function ssoRawTransactionAddAuthDescriptor(
  accountId: BufferId,
  newAuthDesc: AuthDescriptor,
  tb: LegacyTransactionBuilder
): Promise<Buffer> {
  const tx = await tb
    .add(
      addAuthDescriptorOp(
        formatter.ensureBuffer(accountId),
        tb.user.authDescriptor.id,
        newAuthDesc
      )
    )
    .add(nop())
    .buildSigned();
  return tx.encode();
}

export async function addAuthDescriptorToAccount( //maybe rename to addUserToAccount?
  newUser: User,
  accountId: BufferId,
  tb: LegacyTransactionBuilder
): Promise<void> {
  const tx = await tb
    .add(
      addAuthDescriptorOp(
        formatter.ensureBuffer(accountId),
        tb.user.authDescriptor.id,
        newUser.authDescriptor
      )
    )
    .add(nop())
    .build([
      ...tb.user.authDescriptor.signers,
      ...newUser.authDescriptor.signers,
    ]);
  await tx.sign(tb.user.signatureProvider);
  await tx.sign(newUser.signatureProvider);
  await tx.postAndWaitConfirmation();
}

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

export async function deleteAuthDescriptor(
  authDescriptorId: BufferId,
  accountId: BufferId,
  tb: LegacyTransactionBuilder
): Promise<void> {
  const tx = await tb
    .add(
      deleteAuthDescriptorOp(
        formatter.ensureBuffer(accountId),
        tb.user.authDescriptor.id,
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
  user: User,
  adminUser: User,
  session: GtxClient,
  newAuthDesc: AuthDescriptor
): Promise<Account> {
  const tx = session.newTransaction([
    ...user.authDescriptor.signers,
    ...adminUser.authDescriptor.signers,
  ]);
  tx.addOperation(...registerOp(newAuthDesc)); //doesn't need nop
  await tx.sign(user.signatureProvider);
  await tx.sign(adminUser.signatureProvider);
  await tx.postAndWaitConfirmation();
  return <Account>await getById(session, newAuthDesc.id);
}

export async function givePoints(
  user: User,
  adminUser: User,
  session: GtxClient,
  accountId: BufferId,
  points: number
) {
  const tx = session.newTransaction([
    ...user.authDescriptor.signers,
    ...adminUser.authDescriptor.signers,
  ]);
  tx.addOperation(
    ...addRateLimitPointsOp(formatter.ensureBuffer(accountId), points)
  );
  tx.addOperation(...nop());
  await tx.sign(user.signatureProvider);
  await tx.sign(adminUser.signatureProvider);
  await tx.postAndWaitConfirmation();
}

export function createAuthenticatedAccount(
  connection: Connection,
  authenticator: Authenticator
): IAuthenticatedAccount {
  return {
    authenticator,
    addAuthDescriptor: (
      authDescriptor: AuthDescriptor,
      keyPair: SignatureProvider | KeyPair
    ) => _addAuthDescriptor(connection, authenticator, authDescriptor, keyPair),
    deleteAuthDescriptor: (authDescriptorId: BufferId) =>
      _deleteAuthDescriptor(connection, authenticator, authDescriptorId),
    // deleteAllAuthDescriptorsExclude: (authDescriptorId: BufferId) =>
    //   _deleteAllAuthDescriptorsExclude(connection, authenticator, authDescriptorId),
    transfer: (receiverId: BufferId, assetId: BufferId, amount: Amount) =>
      _transfer(connection, authenticator, receiverId, assetId, amount),
    burn: (assetId: BufferId, amount: Amount) =>
      burn(connection, authenticator, assetId, amount),
    ...createAccountObject(connection, authenticator.accountId),
  };
}

async function _addAuthDescriptor(
  connection: Connection,
  authenticator: Authenticator,
  authDescriptor: AuthDescriptor,
  keyPair: SignatureProvider | KeyPair
): Promise<TransactionReceipt> {
  const tb = transactionBuilder(authenticator, connection.client);

  const tx = await tb
    .add(addAuthDescriptor(authDescriptor))
    .addSigners(
      createInMemoryFtKeyStore(keyPair).createKeyHandler(authDescriptor)
    )
    .build();

  return connection.client.sendTransaction(tx);
}

async function _deleteAuthDescriptor(
  connection: Connection,
  authenticator: Authenticator,
  authDescriptorId: BufferId
): Promise<TransactionReceipt> {
  return call(
    connection,
    authenticator,
    deleteAuthDescriptor(authDescriptorId)
  );
}

async function _transfer(
  connection: Connection,
  authenticator: Authenticator,
  receiverId: BufferId,
  assetId: BufferId,
  amount: Amount
): Promise<TransactionReceipt> {
  return call(connection, authenticator, transfer(receiverId, assetId, amount));
}

async function burn(
  connection: Connection,
  authenticator: Authenticator,
  assetId: BufferId,
  amount: Amount
) {
  return call(connection, authenticator, _burnOp(assetId, amount));
}
