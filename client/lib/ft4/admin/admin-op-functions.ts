import {
  IClient,
  SignatureProvider,
  TransactionReceipt,
} from "postchain-client";
import { BufferId } from "../../cryptoUtils";
import { Amount, InvalidUrlError } from "../asset/interfaces";
import * as ops from "./admin-operations";
import {
  AnyAuthDescriptorRegistration,
  gtv,
} from "/ft4/accounts/auth-descriptor";

export function registerAccount(
  chromiaClient: IClient,
  adminSignatureProvider: SignatureProvider,
  authDescriptor: AnyAuthDescriptorRegistration,
): Promise<TransactionReceipt> {
  const ad = gtv.authDescriptorRegistrationToGtv(authDescriptor);
  return chromiaClient.signAndSendUniqueTransaction(
    ops.registerAccount(ad),
    adminSignatureProvider,
  );
}

export function addRateLimitPoints(
  chromiaClient: IClient,
  adminSignatureProvider: SignatureProvider,
  accountId: BufferId,
  amount: number,
): Promise<TransactionReceipt> {
  return chromiaClient.signAndSendUniqueTransaction(
    ops.addRateLimitPoints(accountId, amount),
    adminSignatureProvider,
  );
}

export function registerAsset(
  chromiaClient: IClient,
  adminSignatureProvider: SignatureProvider,
  name: string,
  symbol: string,
  decimals: number,
  iconUrl: string,
): Promise<TransactionReceipt> {
  assertValidUrl(iconUrl);
  return chromiaClient.signAndSendUniqueTransaction(
    ops.registerAsset(name, symbol, decimals, iconUrl),
    adminSignatureProvider,
  );
}

function assertValidUrl(url: string) {
  if (!url) return;

  let parsedUrl: URL;

  // Validate URL format
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new InvalidUrlError(`'${url}' is not a valid URL`);
  }

  // Check for valid protocols
  const validProtocols = ["https:", "http:", "ipfs:"];
  if (!validProtocols.includes(parsedUrl.protocol)) {
    throw new InvalidUrlError(
      `'${url}' does not use a valid protocol, valid protocols are: [${validProtocols.join(
        ", ",
      )}]`,
    );
  }

  if (
    parsedUrl.protocol === "http" &&
    parsedUrl.hostname !== "localhost" &&
    parsedUrl.hostname !== "127.0.0.1"
  ) {
    throw new InvalidUrlError(
      "Insecure protocol (http) is only allowed on localhost or 127.0.0.1",
    );
  }
}

export function mint(
  chromiaClient: IClient,
  adminSignatureProvider: SignatureProvider,
  accountId: BufferId,
  assetId: BufferId,
  amount: Amount,
): Promise<TransactionReceipt> {
  return chromiaClient.signAndSendUniqueTransaction(
    ops.mint(accountId, assetId, amount),
    adminSignatureProvider,
  );
}
