import { AuthDescriptorRegistration, SingleSig } from "@ft4/accounts";
import { FtKeyStore, LoginKeyStore } from "@ft4/authentication";
import { Buffer } from "buffer";

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
  id: Buffer;
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
  asset_limits: AssetLimitRaw[];
  timeout_days: number;
};

export type TransferSenderBlockchains = "all" | Buffer | Buffer[];

export type TransferParticipantSingle = "current" | Buffer;

export type TransferParticipants =
  | "all"
  | TransferParticipantSingle
  | TransferParticipantSingle[];

export type TransferStrategyRulePartial = {
  senderBlockchains: TransferSenderBlockchains;
  senders: TransferParticipants;
  recipients: TransferParticipants;
  timeoutDays: number;
};

export type AssetLimit = {
  id: Buffer;
  minAmount: bigint;
};

export type TransferStrategyRule = TransferStrategyRulePartial & {
  strategies: string[];
  assets: "all" | AssetLimit[];
};

export type TransferStrategyRuleAmount = TransferStrategyRulePartial & {
  minAmount: bigint;
};

export enum PendingTransferExpirationState {
  Expired,
  Valid,
}
