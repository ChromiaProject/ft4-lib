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
import { GtvCompatible } from "../utils/gtv";
import { AssetAmount } from "../asset/types";

export async function registerAccount(
  user: User,
  session: GtxClient,
  newAuthDesc: AuthDescriptor
): Promise<Account> {
  const tx = session.newTransaction(authDesc.getSigners(user.authDescriptor));
  // @ts-ignore
  tx.addOperation(...registerOp(newAuthDesc)); //doesn't need nop
  await tx.sign(user.signatureProvider);
  await tx.postAndWaitConfirmation();
  return await getById(session, authDesc.getId(newAuthDesc));
}

export async function ssoRawTransactionRegister(
  user: User,
  session: GtxClient,
  newAuthDesc: AuthDescriptor
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
      authDesc.deriveAccountId(user.authDescriptor),
      authDesc.getId(user.authDescriptor),
      newAuthDesc
    )
  );
  // @ts-ignore
  tx.addOperation(...nop());
  await tx.sign(user.signatureProvider);
  return tx.encode();
}

export async function ssoRawTransactionAddAuthDescriptor(
  user: User,
  session: GtxClient,
  accountId: BufferId,
  newAuthDesc: AuthDescriptor
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
  // @ts-ignore
  tx.addOperation(...nop());
  await tx.sign(user.signatureProvider);
  return tx.encode();
}

export async function addAuthDescriptorToAccount( //maybe rename to addUserToAccount?
  user: User,
  session: GtxClient,
  newUser: User,
  accountId: BufferId
): Promise<void> {
  const tx = session.newTransaction([
    ...authDesc.getSigners(user.authDescriptor),
    ...authDesc.getSigners(newUser.authDescriptor),
  ]);
  // @ts-ignore
  tx.addOperation(
    ...addAuthDescriptorOp(
      formatter.ensureBuffer(accountId),
      authDesc.getId(user.authDescriptor),
      newUser.authDescriptor
    )
  );
  // @ts-ignore
  tx.addOperation(...nop());
  await tx.sign(user.signatureProvider);
  await tx.sign(newUser.signatureProvider);
  await tx.postAndWaitConfirmation();
  return;
}

export async function deleteAllAuthDescriptorsExclude(
  user: User,
  session: GtxClient,
  authDescriptorId: BufferId,
  accountId: BufferId
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
  user: User,
  session: GtxClient,
  authDescriptorId: BufferId,
  accountId: BufferId
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
  user: User,
  session: GtxClient,
  inputs: XferInput[],
  outputs: XferOutput[]
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
  user: User,
  session: GtxClient,
  fromAccountId: BufferId,
  toAccountId: BufferId,
  assetId: BufferId,
  amount: AssetAmount,
  extra?: { [key: string]: GtvCompatible }
): Promise<void> {
  const input: XferInput = [
    formatter.ensureBuffer(fromAccountId),
    formatter.ensureBuffer(assetId),
    authDesc.getId(user.authDescriptor),
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

  await transferInputsToOutputs(user, session, [input], [output]);
}

export async function burnTokens(
  user: User,
  session: GtxClient,
  fromAccountId: BufferId,
  assetId: BufferId,
  amount: AssetAmount,
  extra?: { [key: string]: GtvCompatible }
): Promise<void> {
  const input: XferInput = [
    formatter.ensureBuffer(fromAccountId),
    formatter.ensureBuffer(assetId),
    authDesc.getId(user.authDescriptor),
    // @ts-ignore
    Number(amount),
    extra ?? {},
  ];

  await transferInputsToOutputs(user, session, [input], []);
}

export async function freeOperation(
  user: User,
  session: GtxClient,
  accountId: BufferId
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
  user: User,
  session: GtxClient,
  accountId: BufferId,
  points: number
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

export async function xcTransfer(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  user: User,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  session: GtxClient /*
  destinationBRID: BufferId,
  destinationAccountId: BufferId,
  assetId: BufferId,
  amount: AssetAmount,*/
): Promise<void> {
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
