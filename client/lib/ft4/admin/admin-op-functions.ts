import { AnyAuthDescriptorRegistration } from "@ft4/accounts";
import {
  Amount,
  InvalidUrlError,
  getAssetDetailsForCrosschainRegistration,
} from "@ft4/asset";
import { TransactionCompletion } from "@ft4/utils";
import { BufferId, IClient, SignatureProvider } from "postchain-client";
import * as ops from "./admin-operations";
import { createClientToBlockchain } from "@ft4/ft-session";

/**
 * registers a new account on the blockchain
 * @param chromiaClient - a client to connect to the blockchain
 * @param adminSignatureProvider - a signature provider with the keypair stored
 * in chromia.yml under `lib.ft4.core.admin`
 * @param authDescriptor - the auth descriptor that will be used to access the
 * account. The account id will be copied from the auth descriptor id
 * @returns a TransactionReceipt object that allows to check the status of the
 * transaction and its RID
 */
export async function registerAccount(
  chromiaClient: IClient,
  adminSignatureProvider: SignatureProvider,
  authDescriptor: AnyAuthDescriptorRegistration,
): Promise<TransactionCompletion> {
  return {
    receipt: await chromiaClient.signAndSendUniqueTransaction(
      ops.registerAccount(authDescriptor),
      adminSignatureProvider,
    ),
  };
}

/**
 * allows an account to call operations without being rate limited by adding points to it
 * @param chromiaClient - a client to connect to the blockchain
 * @param adminSignatureProvider - a signature provider with the keypair stored
 * in chromia.yml under `lib.ft4.core.admin`
 * @param accountId - the account to add points to
 * @param amount - how many points to add
 * @returns a TransactionReceipt object that allows to check the status of the
 * transaction and its RID
 */
export async function addRateLimitPoints(
  chromiaClient: IClient,
  adminSignatureProvider: SignatureProvider,
  accountId: BufferId,
  amount: number,
): Promise<TransactionCompletion> {
  return {
    receipt: await chromiaClient.signAndSendUniqueTransaction(
      ops.addRateLimitPoints(accountId, amount),
      adminSignatureProvider,
    ),
  };
}

/**
 * registers a new asset
 * @param chromiaClient - a client to connect to the blockchain
 * @param adminSignatureProvider - a signature provider with the keypair stored
 * in chromia.yml under `lib.ft4.core.admin`
 * @param name - the name of the asset
 * @param symbol - the symbol (or ticker) for the asset
 * @param decimals - how many decimal places the asset will have
 * @param iconUrl - a URL to an icon for this asset
 * @returns a TransactionReceipt object that allows to check the status of the
 * transaction and its RID
 */
export async function registerAsset(
  chromiaClient: IClient,
  adminSignatureProvider: SignatureProvider,
  name: string,
  symbol: string,
  decimals: number,
  iconUrl: string,
): Promise<TransactionCompletion> {
  assertValidUrl(iconUrl);
  return {
    receipt: await chromiaClient.signAndSendUniqueTransaction(
      ops.registerAsset(name, symbol, decimals, iconUrl),
      adminSignatureProvider,
    ),
  };
}

/**
 * mints assets
 * @param chromiaClient - a client to connect to the blockchain
 * @param adminSignatureProvider - a signature provider with the keypair stored
 * in chromia.yml under `lib.ft4.core.admin`
 * @param accountId - the account that will receive the newly minted asset
 * @param assetId - the asset to mint
 * @param amount - how much to mint
 * @returns a TransactionReceipt object that allows to check the status of the
 * transaction and its RID
 */
export async function mint(
  chromiaClient: IClient,
  adminSignatureProvider: SignatureProvider,
  accountId: BufferId,
  assetId: BufferId,
  amount: Amount,
): Promise<TransactionCompletion> {
  return {
    receipt: await chromiaClient.signAndSendUniqueTransaction(
      ops.mint(accountId, assetId, amount),
      adminSignatureProvider,
    ),
  };
}

/**
 * Registers a crosschain asset
 * @param chromiaClient - a client to connect to the blockchain
 * @param adminSignatureProvider - a signature provider with the keypair stored
 * in chromia.yml under `lib.ft4.core.admin`
 * @param assetId - id of the asset to register
 * @param originBlockchainRid - where this chain will get the asset from (might be different
 * from asset.issuingBrid)
 * @returns a TransactionReceipt object that allows to check the status of the
 * transaction and its RID
 */
export async function registerCrosschainAsset(
  chromiaClient: IClient,
  adminSignatureProvider: SignatureProvider,
  assetId: BufferId,
  originBlockchainRid: BufferId,
): Promise<TransactionCompletion> {
  const originBlockchainClient = await createClientToBlockchain(
    chromiaClient,
    originBlockchainRid,
  );
  const asset = await getAssetDetailsForCrosschainRegistration(
    originBlockchainClient,
    assetId,
  );
  return {
    receipt: await chromiaClient.signAndSendUniqueTransaction(
      ops.registerCrosschainAsset(asset, originBlockchainRid),
      adminSignatureProvider,
    ),
  };
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
