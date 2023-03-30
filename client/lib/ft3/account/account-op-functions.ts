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
import { nop, send } from "../utils";
import { authDescriptor as authDesc } from "./auth-descriptor";
import { AuthDescriptor } from "./auth-descriptor/types";
import { createPaymentHistoryIterator } from "./payment-history/payment-history-iterator";
import {
  PaymentHistoryIterator,
  PaymentHistoryStore,
} from "./payment-history/interfaces";
import { BufferId } from "../../cryptoUtils";
import { ensureBuffer } from "postchain-client/built/src/formatter";

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
  accountId: BufferId,
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
      ensureBuffer(accountId),
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
  const tx = await session.newTransaction(
    authDesc.getSigners(user.authDescriptor)
  );
  tx.addOperation(
    ...addAuthDescriptorOp(
      ensureBuffer(accountId),
      authDesc.getId(user.authDescriptor),
      authDescriptor
    )
  );
  tx.addOperation(...nop());
  await tx.sign(user.signatureProvider);
  await send(tx);
  return authDesc.getId(authDescriptor);
}

export async function deleteAllAuthDescriptorsExclude(
  authDescriptorId: BufferId,
  accountId: BufferId,
  user: User,
  session: GtxClient
): Promise<void> {
  const tx = session.newTransaction(authDesc.getSigners(user.authDescriptor));
  tx.addOperation(
    ...deleteAllAuthDescriptorsExcludeOp(
      ensureBuffer(accountId),
      ensureBuffer(authDescriptorId)
    )
  );
  tx.addOperation(...nop());
  await tx.sign(user.signatureProvider);
  await send(tx);
}

export async function deleteAuthDescriptor(
  authDescriptorId: BufferId,
  accountId: BufferId,
  user: User,
  session: GtxClient
): Promise<void> {
  const tx = session.newTransaction(authDesc.getSigners(user.authDescriptor));
  tx.addOperation(
    ...deleteAuthDescriptorOp(
      ensureBuffer(accountId),
      authDesc.getId(user.authDescriptor),
      ensureBuffer(authDescriptorId)
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
  fromAccountId: BufferId,
  toAccountId: BufferId,
  assetId: BufferId,
  amount: bigint,
  user: User,
  session: GtxClient
): Promise<void> {
  const input: XferInput = [
    ensureBuffer(fromAccountId),
    ensureBuffer(assetId),
    authDesc.getId(user.authDescriptor),
    amount,
  ];

  const output: XferOutput = [
    ensureBuffer(toAccountId),
    ensureBuffer(assetId),
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
    ensureBuffer(fromAccountId),
    ensureBuffer(assetId),
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
  tx.addOperation(...freeOp(ensureBuffer(accountId)));
  tx.addOperation(...nop());
  await tx.sign(user.signatureProvider);
  await send(tx);
}

export async function givePoints(
  accountId: BufferId,
  points: number,
  user: User,
  session: GtxClient
) {
  const tx = session.newTransaction(authDesc.getSigners(user.authDescriptor));
  tx.addOperation(...givePointsOp(ensureBuffer(accountId), points));
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
