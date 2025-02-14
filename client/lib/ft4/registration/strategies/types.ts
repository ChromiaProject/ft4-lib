import { AuthDescriptorRegistration, SingleSig } from "@ft4/accounts";
import { FtKeyStore, LoginKeyStore } from "@ft4/authentication";

export type LoginDetails = {
  authDescriptor: AuthDescriptorRegistration<SingleSig>;
  loginKeyStore: LoginKeyStore;
  disposableKeyStore: FtKeyStore;
};

export type AllowListRaw = {
  allow_all: boolean;
  allowed_values: Buffer[];
};

export type AssetLimitRaw = {
  allow_all: boolean;
  allowed_values: AllowedAssets[];
};

export type AllowedAssets = {
  id: Buffer;
  name: string;
  issuing_blockchain_rid: Buffer;
  min_amount: bigint;
};

/**
 * Raw transfer strategy rule type that represents rules returned from blockchain
 */
export type TransferStrategyRuleRaw = {
  strategies: string[];
  blockchains: AllowListRaw;
  senders: AllowListRaw;
  recipients: AllowListRaw;
  require_same_address: boolean;
  allow_all_assets: boolean;
  asset_limits: AllowedAssets[];
  timeout_days: number;
};

export type TransferStrategyRuleRawV2 = {
  strategies: string[];
  blockchains: AllowListRaw;
  senders: AllowListRaw;
  recipients: AllowListRaw;
  require_same_address: boolean;
  assets?: AssetLimitRaw;
  timeout_days: number;
};

export enum PendingTransferExpirationState {
  Expired,
  Valid,
}
