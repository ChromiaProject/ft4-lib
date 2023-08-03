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
  return withErrorMapper(() =>
    chromiaClient.signAndSendUniqueTransaction(
      ops.registerAccount(authDescriptor),
      adminSignatureProvider
    )
  );
}

export function addRateLimitPoints(
  chromiaClient: IClient,
  adminSignatureProvider: SignatureProvider,
  accountId: BufferId,
  amount: number
): Promise<TransactionReceipt> {
  return withErrorMapper(() =>
    chromiaClient.signAndSendUniqueTransaction(
      ops.addRateLimitPoints(accountId, amount),
      adminSignatureProvider
    )
  );
}

export async function registerAsset(
  chromiaClient: IClient,
  adminSignatureProvider: SignatureProvider,
  name: string,
  symbol: string,
  decimals: number,
  iconUrl: string
): Promise<TransactionReceipt> {
  return withErrorMapper(() =>
    chromiaClient.signAndSendUniqueTransaction(
      ops.registerAsset(name, symbol, decimals, iconUrl),
      adminSignatureProvider
    )
  );
}

export function mint(
  chromiaClient: IClient,
  adminSignatureProvider: SignatureProvider,
  accountId: BufferId,
  assetId: BufferId,
  amount: Amount
): Promise<TransactionReceipt> {
  return withErrorMapper(() =>
    chromiaClient.signAndSendUniqueTransaction(
      ops.mint(accountId, assetId, amount),
      adminSignatureProvider
    )
  );
}

async function withErrorMapper(backendCall) {
  try {
    return await backendCall();
  } catch (err) {
    if (err.shortReason === "Invalid URL for icon") {
      throw new InvalidUrlError(err.shortReason);
    }

    throw err;
  }
}
