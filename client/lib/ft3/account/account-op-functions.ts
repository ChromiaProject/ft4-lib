import { freeOp, registerOp } from "./account-dev-operations";
import {
  addAuthDescriptorOp,
  deleteAllAuthDescriptorsExcludeOp,
  deleteAuthDescriptorOp,
  transferOp,
} from "./account-operations";
import { GtxClient } from "postchain-client/built/src/gtx/interfaces";
import { Account, XferInput, XferOutput, User } from "./types";
import { getById } from "./account-query-functions";
import { nop, send } from "../utils";
import { authDescriptor as authDesc } from "./auth-descriptor";
import { AuthDescriptor } from "./auth-descriptor/types";
import { createPaymentHistoryIterator } from "./payment-history/payment-history-iterator";
import {
  PaymentHistoryIterator,
  PaymentHistoryStore,
} from "./payment-history/interfaces";

export async function registerAccount(
  newAuthDesc: AuthDescriptor,
  user: User,
  session: GtxClient
): Promise<Account> {
  const tx = session.newTransaction(authDesc.getSigners(user.authDescriptor));
  tx.addOperation(...registerOp(newAuthDesc));
  await tx.sign(user.signatureProvider);
  await send(tx);
  return getById(authDesc.getId(newAuthDesc), session);
}

export async function ssoRawTransactionRegister(
  newAuthDesc: AuthDescriptor,
  user: User,
  session: GtxClient
): Promise<Buffer> {
  const tx = session.newTransaction(
    [
      authDesc.getSigners(user.authDescriptor),
      authDesc.getSigners(newAuthDesc),
    ].flat()
  );
  tx.addOperation(...registerOp(user.authDescriptor));
  tx.addOperation(
    ...addAuthDescriptorOp(
      authDesc.getId(user.authDescriptor),
      authDesc.getId(user.authDescriptor),
      newAuthDesc
    )
  );
  await tx.sign(user.signatureProvider);
  return tx.encode();
}

export async function ssoRawTransactionAddAuthDescriptor(
  accountId: Buffer,
  newAuthDesc: AuthDescriptor,
  user: User,
  session: GtxClient
): Promise<Buffer> {
  const tx = await session.newTransaction(
    [
      authDesc.getSigners(user.authDescriptor),
      authDesc.getSigners(newAuthDesc),
    ].flat()
  );
  tx.addOperation(
    ...addAuthDescriptorOp(
      accountId,
      authDesc.getId(user.authDescriptor),
      newAuthDesc
    )
  );
  await tx.sign(user.signatureProvider);
  return tx.encode();
}

export async function addAuthDescriptorToAcc(
  authDescriptor: AuthDescriptor,
  accountId: Buffer,
  user: User,
  session: GtxClient
): Promise<void> {
  const tx = await session.newTransaction(
    authDesc.getSigners(user.authDescriptor)
  );
  tx.addOperation(
    ...addAuthDescriptorOp(
      accountId,
      authDesc.getId(user.authDescriptor),
      authDescriptor
    )
  );
  tx.addOperation(...nop());
  await tx.sign(user.signatureProvider);
  await send(tx);
}

export async function deleteAllAuthDescriptorsExclude(
  authDescriptorId: Buffer,
  accountId: Buffer,
  user: User,
  session: GtxClient
): Promise<void> {
  const tx = session.newTransaction(authDesc.getSigners(user.authDescriptor));
  tx.addOperation(
    ...deleteAllAuthDescriptorsExcludeOp(accountId, authDescriptorId)
  );
  tx.addOperation(...nop());
  await tx.sign(user.signatureProvider);
  await send(tx);
}

export async function deleteAuthDescriptor(
  authDescriptorId: Buffer,
  accountId: Buffer,
  user: User,
  session: GtxClient
): Promise<void> {
  const tx = session.newTransaction(authDesc.getSigners(user.authDescriptor));
  tx.addOperation(
    ...deleteAuthDescriptorOp(
      accountId,
      authDesc.getId(user.authDescriptor),
      authDescriptorId
    )
  );
  tx.addOperation(...nop());
  await tx.sign(user.signatureProvider);
  await send(tx);
}

export async function transferInputsToOutputs(
  inputs: XferInput[],
  outputs: XferOutput[],
  user: User,
  session: GtxClient
): Promise<void> {
  const tx = session.newTransaction(authDesc.getSigners(user.authDescriptor));
  tx.addOperation(...transferOp(inputs, outputs));
  tx.addOperation(...nop());
  await tx.sign(user.signatureProvider);
  await send(tx);
}

export async function transfer(
  fromAccountId: Buffer,
  toAccountId: Buffer,
  assetId: Buffer,
  amount: bigint,
  user: User,
  session: GtxClient
): Promise<void> {
  const input: XferInput = [
    fromAccountId,
    assetId,
    authDesc.getId(user.authDescriptor),
    amount,
  ];

  const output: XferOutput = [toAccountId, assetId, amount];

  await transferInputsToOutputs([input], [output], user, session);
}

export async function burnTokens(
  fromAccountId: Buffer,
  assetId: Buffer,
  amount: bigint,
  user: User,
  session: GtxClient
): Promise<void> {
  const input: XferInput = [
    fromAccountId,
    assetId,
    authDesc.getId(user.authDescriptor),
    amount,
  ];

  await transferInputsToOutputs([input], [], user, session);
}

export async function freeOperation(
  accountId: Buffer,
  user: User,
  session: GtxClient
) {
  const tx = session.newTransaction(authDesc.getSigners(user.authDescriptor));
  tx.addOperation(...freeOp(accountId));
  tx.addOperation(...nop());
  await tx.sign(user.signatureProvider);
  await send(tx);
}

export function getPaymentHistoryIterator(
  paymentHistoryStore: PaymentHistoryStore
): PaymentHistoryIterator {
  return createPaymentHistoryIterator(paymentHistoryStore);
}

/*
export async function xcTransfer(
  /*
    destinationBRID: Buffer,
    destinationAccountId: Buffer,
    assetId: Buffer,
    amount: number
  * / user: User,
  session: GtxClient
): Promise<void> {
  throw new Error("Not implemented!");
  /*const tx = await xcTransferOp(
    destinationBRID,
    destinationAccountId,
    assetId,
    amount
  );
  await tx.post();
  await this.sync();* /
}
*/
