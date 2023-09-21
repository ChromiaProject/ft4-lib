import {
  IClient,
  SignatureProvider,
  TransactionReceipt,
} from "postchain-client";
import { AuthDescriptor } from "../accounts/auth-descriptor";
import * as ops from "./admin-operations";
import { BufferId } from "../../cryptoUtils";
import { Amount } from "../asset/interfaces";
import { Asset } from "../asset/types";

/**
 * registers a new account on the blockchain
 * @param chromiaClient a client to connect to the blockchain
 * @param adminSignatureProvider a signature provider with the keypair stored
 * in chromia.yml under `lib.ft4.admin`
 * @param authDescriptor the auth descriptor that will be used to access the
 * account. The account id will be copied from the auth descriptor id
 * @returns a TransactionReceipt object that allows to check the status of the
 * transaction and its RID
 */
export function registerAccount(
  chromiaClient: IClient,
  adminSignatureProvider: SignatureProvider,
  authDescriptor: AuthDescriptor,
): Promise<TransactionReceipt> {
  return chromiaClient.signAndSendUniqueTransaction(
    ops.registerAccount(authDescriptor),
    adminSignatureProvider,
  );
}

/**
 * allows an account to call operations without being rate limited by adding points to it
 * @param chromiaClient a client to connect to the blockchain
 * @param adminSignatureProvider a signature provider with the keypair stored
 * in chromia.yml under `lib.ft4.admin`
 * @param accountId the account to add points to
 * @param amount how many points to add
 * @returns a TransactionReceipt object that allows to check the status of the
 * transaction and its RID
 */
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

/**
 * registers a new asset
 * @param chromiaClient a client to connect to the blockchain
 * @param adminSignatureProvider a signature provider with the keypair stored
 * in chromia.yml under `lib.ft4.admin`
 * @param name the name of the asset
 * @param symbol the symbol (or ticker) for the asset
 * @param decimals how many decimal places the asset will have
 * @param iconUrl a URL to an icon for this asset
 * @returns a TransactionReceipt object that allows to check the status of the
 * transaction and its RID
 */
export function registerAsset(
  chromiaClient: IClient,
  adminSignatureProvider: SignatureProvider,
  name: string,
  symbol: string,
  decimals: number,
  iconUrl: string,
): Promise<TransactionReceipt> {
  return chromiaClient.signAndSendUniqueTransaction(
    ops.registerAsset(name, symbol, decimals, iconUrl),
    adminSignatureProvider,
  );
}

/**
 * mints assets
 * @param chromiaClient a client to connect to the blockchain
 * @param adminSignatureProvider a signature provider with the keypair stored
 * in chromia.yml under `lib.ft4.admin`
 * @param accountId the account that will receive the newly minted asset
 * @param assetId the asset to mint
 * @param amount how much to mint
 * @returns a TransactionReceipt object that allows to check the status of the
 * transaction and its RID
 */
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

/**
 * Registers a crosschain asset
 * @param chromiaClient a client to connect to the blockchain
 * @param adminSignatureProvider a signature provider with the keypair stored
 * in chromia.yml under `lib.ft4.admin`
 * @param asset the asset to register
 * @param originBrid where this chain will get the asset from (might be different
 * from asset.issuingBrid)
 * @returns a TransactionReceipt object that allows to check the status of the
 * transaction and its RID
 */
export function registerCrosschainAsset(
  chromiaClient: IClient,
  adminSignatureProvider: SignatureProvider,
  asset: Asset,
  originBrid: BufferId,
): Promise<TransactionReceipt> {
  return chromiaClient.signAndSendUniqueTransaction(
    ops.registerCrosschainAsset(asset, originBrid),
    adminSignatureProvider,
  );
}
