import {
  IClient,
  SignatureProvider,
  TransactionReceipt,
} from "postchain-client";
import { AuthDescriptor } from "../accounts/auth-descriptor";
import * as ops from "./admin-operations";
import { BufferId } from "../../cryptoUtils";
import { Amount, InvalidUrlError } from "../asset/interfaces";

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
  assertValidUrl(iconUrl);
  return chromiaClient.signAndSendUniqueTransaction(
    ops.registerAsset(name, symbol, decimals, iconUrl),
    adminSignatureProvider
  );
}

function assertValidUrl(url: string): boolean {
  if (url === "") return true;
  if (!url.startsWith("https") && !url.startsWith("ipfs"))
    throw new InvalidUrlError(`'${url}' does not use a valid protocol`);
  try {
    new URL(url);
  } catch {
    throw new InvalidUrlError(`'${url}' is not a valud url`);
  }
  return true;
}

export function mint(
  chromiaClient: IClient,
  adminSignatureProvider: SignatureProvider,
  accountId: BufferId,
  assetId: BufferId,
  amount: Amount
): Promise<TransactionReceipt> {
  return chromiaClient.signAndSendUniqueTransaction(
    ops.mint(accountId, assetId, amount),
    adminSignatureProvider
  );
}
