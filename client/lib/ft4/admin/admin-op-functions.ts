import {
  IClient,
  SignatureProvider,
  TransactionReceipt,
} from "postchain-client";
import { AuthDescriptor } from "../accounts/auth-descriptor";
import * as ops from "./admin-operations";
import { BufferId } from "../../cryptoUtils";
import { Amount } from "../asset/interfaces";

export function registerAccount(
  chromiaClient: IClient,
  adminSignatureProvider: SignatureProvider,
  authDescriptor: AuthDescriptor
): Promise<TransactionReceipt> {
  return chromiaClient.signAndSendUniqueTransaction(
    ops.registerAccount(authDescriptor),
    adminSignatureProvider
  );
}

export function addRateLimitPoints(
  chromiaClient: IClient,
  adminSignatureProvider: SignatureProvider,
  accountId: BufferId,
  amount: number
): Promise<TransactionReceipt> {
  return chromiaClient.signAndSendUniqueTransaction(
    ops.addRateLimitPoints(accountId, amount),
    adminSignatureProvider
  );
}

export function registerAsset(
  chromiaClient: IClient,
  adminSignatureProvider: SignatureProvider,
  name: string,
  symbol: string,
  decimals: number,
  iconUrl: string
): Promise<TransactionReceipt> {
  return chromiaClient.signAndSendUniqueTransaction(
    ops.registerAsset(name, symbol, decimals, iconUrl),
    adminSignatureProvider
  );
}

export function mint(
  chromiaClient: IClient,
  adminSignatureProvider: SignatureProvider,
  accountId: Buffer,
  assetId: Buffer,
  amount: Amount
): Promise<TransactionReceipt> {
  return chromiaClient.signAndSendUniqueTransaction(
    ops.mint(accountId, assetId, amount),
    adminSignatureProvider
  );
}
