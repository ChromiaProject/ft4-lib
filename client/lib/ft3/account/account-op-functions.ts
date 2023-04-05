/* eslint @typescript-eslint/ban-ts-comment: 0 */
import { freeOp, givePointsOp, registerOp } from "./account-dev-operations";
import {
  addAuthDescriptorOp,
  deleteAllAuthDescriptorsExcludeOp,
  deleteAuthDescriptorOp,
  transferOp,
} from "./account-operations";
import { GtxClient } from "postchain-client/built/src/gtx/interfaces";
import { Account, XferInput, XferOutput, User } from "./types";
import { getById } from "./account-query-functions";
import { nop } from "../utils";
import { authDescriptor as authDesc } from "./auth-descriptor";
import { AuthDescriptor } from "./auth-descriptor/types";
import { createPaymentHistoryIterator } from "./payment-history/payment-history-iterator";
import {
  PaymentHistoryIterator,
  PaymentHistoryStore,
} from "./payment-history/interfaces";
import { BufferId } from "../../cryptoUtils";
import { formatter } from "postchain-client";

export async function registerAccount(
  newAuthDesc: AuthDescriptor,
  user: User,
  session: GtxClient
): Promise<Account> {
  const tx = session.newTransaction(authDesc.getSigners(user.authDescriptor));
  // @ts-ignore
  tx.addOperation(...registerOp(newAuthDesc));
  await tx.sign(user.signatureProvider);
  await tx.postAndWaitConfirmation();
  return await getById(authDesc.getId(newAuthDesc), session);
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
  // @ts-ignore
  tx.addOperation(...registerOp(user.authDescriptor));
  // @ts-ignore
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
  accountId: BufferId,
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
  // @ts-ignore
  tx.addOperation(
    ...addAuthDescriptorOp(
      formatter.ensureBuffer(accountId),
      authDesc.getId(user.authDescriptor),
      newAuthDesc
    )
  );
  await tx.sign(user.signatureProvider);
  return tx.encode();
}

export async function addAuthDescriptorToAcc(
  authDescriptor: AuthDescriptor,
  accountId: BufferId,
  user: User,
  session: GtxClient
): Promise<Buffer> {
  const tx = session.newTransaction(authDesc.getSigners(user.authDescriptor));
  // @ts-ignore
  tx.addOperation(
    ...addAuthDescriptorOp(
      formatter.ensureBuffer(accountId),
      authDesc.getId(user.authDescriptor),
      authDescriptor
    )
  );
  // @ts-ignore
  tx.addOperation(...nop());
  await tx.sign(user.signatureProvider);
  await tx.postAndWaitConfirmation();
  return authDesc.getId(authDescriptor);
}

export async function deleteAllAuthDescriptorsExclude(
  authDescriptorId: BufferId,
  accountId: BufferId,
  user: User,
  session: GtxClient
): Promise<void> {
  const tx = session.newTransaction(authDesc.getSigners(user.authDescriptor));
  // @ts-ignore
  tx.addOperation(
    ...deleteAllAuthDescriptorsExcludeOp(
      formatter.ensureBuffer(accountId),
      formatter.ensureBuffer(authDescriptorId)
    )
  );
  // @ts-ignore
  tx.addOperation(...nop());
  await tx.sign(user.signatureProvider);
  await tx.postAndWaitConfirmation();
}

export async function deleteAuthDescriptor(
  authDescriptorId: BufferId,
  accountId: BufferId,
  user: User,
  session: GtxClient
): Promise<void> {
  const tx = session.newTransaction(authDesc.getSigners(user.authDescriptor));
  // @ts-ignore
  tx.addOperation(
    ...deleteAuthDescriptorOp(
      formatter.ensureBuffer(accountId),
      authDesc.getId(user.authDescriptor),
      formatter.ensureBuffer(authDescriptorId)
    )
  );
  // @ts-ignore
  tx.addOperation(...nop());
  await tx.sign(user.signatureProvider);
  await tx.postAndWaitConfirmation();
}

export async function transferInputsToOutputs(
  inputs: XferInput[],
  outputs: XferOutput[],
  user: User,
  session: GtxClient
): Promise<void> {
  const tx = session.newTransaction(authDesc.getSigners(user.authDescriptor));
  // @ts-ignore
  tx.addOperation(...transferOp(inputs, outputs));
  // @ts-ignore
  tx.addOperation(...nop());
  await tx.sign(user.signatureProvider);
  await tx.postAndWaitConfirmation();
}

export async function transfer(
  fromAccountId: BufferId,
  toAccountId: BufferId,
  assetId: BufferId,
  amount: bigint,
  user: User,
  session: GtxClient
): Promise<void> {
  const input: XferInput = [
    formatter.ensureBuffer(fromAccountId),
    formatter.ensureBuffer(assetId),
    authDesc.getId(user.authDescriptor),
    amount,
  ];

  const output: XferOutput = [
    formatter.ensureBuffer(toAccountId),
    formatter.ensureBuffer(assetId),
    amount,
  ];

  await transferInputsToOutputs([input], [output], user, session);
}

export async function burnTokens(
  fromAccountId: BufferId,
  assetId: BufferId,
  amount: bigint,
  user: User,
  session: GtxClient
): Promise<void> {
  const input: XferInput = [
    formatter.ensureBuffer(fromAccountId),
    formatter.ensureBuffer(assetId),
    authDesc.getId(user.authDescriptor),
    amount,
  ];

  await transferInputsToOutputs([input], [], user, session);
}

export async function freeOperation(
  accountId: BufferId,
  user: User,
  session: GtxClient
) {
  const tx = session.newTransaction(authDesc.getSigners(user.authDescriptor));
  // @ts-ignore
  tx.addOperation(...freeOp(formatter.ensureBuffer(accountId)));
  // @ts-ignore
  tx.addOperation(...nop());
  await tx.sign(user.signatureProvider);
  await tx.postAndWaitConfirmation();
}

export async function givePoints(
  accountId: BufferId,
  points: number,
  user: User,
  session: GtxClient
) {
  const tx = session.newTransaction(authDesc.getSigners(user.authDescriptor));
  // @ts-ignore
  tx.addOperation(...givePointsOp(formatter.ensureBuffer(accountId), points));
  // @ts-ignore
  tx.addOperation(...nop());
  await tx.sign(user.signatureProvider);
  await tx.postAndWaitConfirmation();
}

export function getPaymentHistoryIterator(
  paymentHistoryStore: PaymentHistoryStore
): PaymentHistoryIterator {
  return createPaymentHistoryIterator(paymentHistoryStore);
}

/*
export async function xcTransfer(
  /*
    destinationBRId: BufferId,
    destinationAccountId: BufferId,
    assetId: BufferId,
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
