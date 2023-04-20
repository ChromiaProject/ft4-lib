/* eslint @typescript-eslint/ban-ts-comment: 0 */
import { freeOp, givePointsOp, registerOp } from "./account-dev-operations";
import {
  addAuthDescriptorOp,
  deleteAllAuthDescriptorsExcludeOp,
  deleteAuthDescriptorOp,
  transferOp,
} from "./account-operations";
import { Account, XferInput, XferOutput, User } from "./types";
import { getById } from "./account-query-functions";
import { nop } from "../utils";
import { AuthDescriptor } from "./auth-descriptor/types";
import { createPaymentHistoryIterator } from "./payment-history/payment-history-iterator";
import {
  PaymentHistoryIterator,
  PaymentHistoryStore,
} from "./payment-history/interfaces";
import { BufferId } from "../../cryptoUtils";
import { formatter } from "postchain-client";
import { TransactionBuilder } from "../utils/transaction-builder";
import { GtvCompatible } from "../utils/gtv";
import { deriveAccountId, toGtv } from "./auth-descriptor";

export async function registerAccount(
  newAuthDesc: AuthDescriptor,
  tb: TransactionBuilder
): Promise<Account> {
  const tx = await tb.add(registerOp(newAuthDesc)).buildSigned();
  await tx.postAndWaitConfirmation();
  return getById(tb.session, newAuthDesc.id);
}

export async function ssoRawTransactionRegister(
  newAuthDesc: AuthDescriptor,
  authDescriptor: AuthDescriptor,
  tb: TransactionBuilder
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
  tb: TransactionBuilder
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
  tb: TransactionBuilder
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
  tb: TransactionBuilder
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
  tb: TransactionBuilder
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
  tb: TransactionBuilder
): Promise<void> {
  const tx = await tb.add(transferOp(inputs, outputs)).add(nop()).buildSigned();
  await tx.postAndWaitConfirmation();
}

export async function transfer(
  fromAccountId: BufferId,
  toAccountId: BufferId,
  assetId: BufferId,
  amount: bigint,
  tb: TransactionBuilder,
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
  tb: TransactionBuilder,
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
  tb: TransactionBuilder
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
  tb: TransactionBuilder
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
