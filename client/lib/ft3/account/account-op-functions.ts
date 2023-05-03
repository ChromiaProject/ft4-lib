/* eslint @typescript-eslint/ban-ts-comment: 0 */
import { freeOp, givePointsOp, registerOp } from "./account-dev-operations";
import {
  addAuthDescriptorOp,
  addAuthDescriptorV2,
  deleteAllAuthDescriptorsExcludeOp,
  deleteAuthDescriptorOp,
  deleteAuthDescriptorV2,
  transferOp,
} from "./account-operations";
import {
  Account,
  XferInput,
  XferOutput,
  User,
  IAuthenticatedAccount,
} from "./types";
import { createAccountObject, getById } from "./account-query-functions";
import { nop } from "../utils";
import { AuthDescriptor } from "./auth-descriptor/types";
import { createPaymentHistoryIterator } from "./payment-history/payment-history-iterator";
import {
  PaymentHistoryIterator,
  PaymentHistoryStore,
} from "./payment-history/interfaces";
import { BufferId, KeyPair } from "../../cryptoUtils";
import { formatter } from "postchain-client";
import { LegacyTransactionBuilder } from "../utils/transaction-builder-old";
import { GtvCompatible } from "../utils/gtv";
import { deriveAccountId, toGtv } from "./auth-descriptor";
import { Connection } from "../interfaces";
import { createInMemoryFTKeyStore } from "../authentication/ft/key-stores/in-memory";
import { transactionBuilder } from "../utils/transaction-builder";
import { Authenticator } from "../authentication/interfaces";
import { AssetAmount } from "../asset/types";
import { call } from "../ft-session";

export async function registerAccount(
  newAuthDesc: AuthDescriptor,
  tb: LegacyTransactionBuilder
): Promise<Account> {
  const tx = await tb.add(registerOp(newAuthDesc)).buildSigned();
  await tx.postAndWaitConfirmation();
  return getById(tb.session, newAuthDesc.id);
}

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

export async function transferInputsToOutputs(
  inputs: XferInput[],
  outputs: XferOutput[],
  tb: LegacyTransactionBuilder
): Promise<void> {
  const tx = await tb.add(transferOp(inputs, outputs)).add(nop()).buildSigned();
  await tx.postAndWaitConfirmation();
}

export async function transfer(
  fromAccountId: BufferId,
  toAccountId: BufferId,
  assetId: BufferId,
  amount: bigint,
  tb: LegacyTransactionBuilder,
  extra?: { [key: string]: GtvCompatible }
): Promise<void> {
  const input: XferInput = [
    formatter.ensureBuffer(fromAccountId),
    formatter.ensureBuffer(assetId),
    tb.user.authDescriptor.id,
    // @ts-ignore
    Number(amount),
    extra ?? {},
  ];

  const output: XferOutput = [
    formatter.ensureBuffer(toAccountId),
    formatter.ensureBuffer(assetId),
    // @ts-ignore
    Number(amount),
    extra ?? {},
  ];

  await transferInputsToOutputs([input], [output], tb);
}

export async function burnTokens(
  fromAccountId: BufferId,
  assetId: BufferId,
  amount: bigint,
  tb: LegacyTransactionBuilder,
  extra?: { [key: string]: GtvCompatible }
): Promise<void> {
  const input: XferInput = [
    formatter.ensureBuffer(fromAccountId),
    formatter.ensureBuffer(assetId),
    tb.user.authDescriptor.id,
    // @ts-ignore
    Number(amount),
    extra ?? {},
  ];
  await transferInputsToOutputs([input], [], tb);
}

export async function freeOperation(
  accountId: BufferId,
  tb: LegacyTransactionBuilder
) {
  const tx = await tb
    .add(freeOp(formatter.ensureBuffer(accountId)))
    .add(nop())
    .buildSigned();
  await tx.postAndWaitConfirmation();
}

export async function givePoints(
  accountId: BufferId,
  points: number,
  tb: LegacyTransactionBuilder
) {
  const tx = await tb
    .add(givePointsOp(formatter.ensureBuffer(accountId), points))
    .add(nop())
    .buildSigned();
  await tx.postAndWaitConfirmation();
}

export function getPaymentHistoryIterator(
  paymentHistoryStore: PaymentHistoryStore
): PaymentHistoryIterator {
  return createPaymentHistoryIterator(paymentHistoryStore);
}

export async function xcTransfer(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  /*destinationBRID: BufferId,
  destinationAccountId: BufferId,
  assetId: BufferId,
  amount: AssetAmount,*/
  throw new Error("Not implemented!");
  /*const tx = await xcTransferOp(
    destinationBRID,
    destinationAccountId,
    assetId,
    amount
  );
  await tx.post();
  await this.sync();*/
}

export function createAuthenticatedAccount(
  connection: Connection,
  authenticator: Authenticator
): IAuthenticatedAccount {
  return {
    authenticator,
    addAuthDescriptor: (authDescriptor: AuthDescriptor, keyPair: KeyPair) =>
      _addAuthDescriptor(connection, authenticator, authDescriptor, keyPair),
    deleteAuthDescriptor: (authDescriptorId: BufferId) =>
      _deleteAuthDescriptor(connection, authenticator, authDescriptorId),
    transfer: (receiverId: BufferId, assetId: BufferId, amount: AssetAmount) =>
      _transfer(connection, authenticator, receiverId, assetId, amount),
    xcTransfer: (
      brid: BufferId,
      receiverId: BufferId,
      assetId: BufferId,
      amount: AssetAmount
    ) =>
      _xcTransfer(connection, authenticator, brid, receiverId, assetId, amount),
    burn: (assetId: BufferId, amount: AssetAmount) =>
      _burn(connection, authenticator, assetId, amount),
    ...createAccountObject(connection, authenticator.accountId),
  };
}

async function _addAuthDescriptor(
  connection: Connection,
  authenticator: Authenticator,
  authDescriptor: AuthDescriptor,
  keyPair: KeyPair
): Promise<void> {
  const tb = transactionBuilder(authenticator, connection.client);

  const tx = await tb
    .add(addAuthDescriptorV2(authDescriptor))
    .addSigners(
      createInMemoryFTKeyStore(keyPair).createKeyHandler(authDescriptor)
    )
    .build();

  return tx.postAndWaitConfirmation();
}

async function _deleteAuthDescriptor(
  connection: Connection,
  authenticator: Authenticator,
  authDescriptorId: BufferId
): Promise<void> {
  return call(
    connection,
    authenticator,
    deleteAuthDescriptorV2(authDescriptorId)
  );
}

async function _transfer(
  connection: Connection,
  authenticator: Authenticator,
  receiverId: BufferId,
  assetId: BufferId,
  amount: AssetAmount
): Promise<void> {
  // FIXME: will be removed when 1-to-1 transfer operation is added
  const keyHandler = authenticator.keyHandlers.find((keyHandler) =>
    keyHandler.satisfiesAuthRequirements(["T"])
  );
  const input: XferInput = [
    authenticator.accountId,
    formatter.ensureBuffer(assetId),
    keyHandler.authDescriptor.id,
    amount,
    {},
  ];
  const output: XferOutput = [
    formatter.ensureBuffer(receiverId),
    formatter.ensureBuffer(assetId),
    amount,
    {},
  ];
  return call(connection, authenticator, transferOp([input], [output]));
}

/* eslint-disable */
// @ts-ignore
async function _xcTransfer(
  connection: Connection,
  authenticator: Authenticator,
  brid: BufferId,
  receiverId: BufferId,
  assetId: BufferId,
  amount: AssetAmount
): Promise<void> {
  throw new Error("Not implemented!");
}
/* eslint-enable */

async function _burn(
  connection: Connection,
  authenticator: Authenticator,
  assetId: BufferId,
  amount: AssetAmount
) {
  // FIXME: will be removed when 1-to-1 transfer operation is added
  const keyHandler = authenticator.keyHandlers.find((keyHandler) =>
    keyHandler.satisfiesAuthRequirements(["T"])
  );
  const input: XferInput = [
    authenticator.accountId,
    formatter.ensureBuffer(assetId),
    keyHandler.authDescriptor.id,
    amount,
    {},
  ];
  return call(connection, authenticator, transferOp([input], []));
}
