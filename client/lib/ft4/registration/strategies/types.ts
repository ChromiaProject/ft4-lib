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

/**
 * Options for the import strategy.
 *
 * @remarks
 * This type allows configuring whether a signature is required and optionally specifying the origin account ID.
 * - If `forceSignature` is `true`, a signature will always be required.
 * - If `forceSignature` is `false` or undefined, the function will try to import without a signature if possible,
 *   reverting to signing if needed.
 * - If `originAccountId` is provided, it specifies the account ID to import. If not provided, the account ID
 *   will be inferred from the signers of the main auth descriptor.
 */
export type ImportStrategyOptions =
  | {
      forceSignature: true;
      originAccountId?: Buffer;
    }
  | {
      forceSignature?: false;
      originAccountId?: never;
    };

/**
 * The configuration for the import strategy
 */
export type ImportConfig = {
  /**
   * The chains that are trusted to import accounts.
   */
  trustedChains: Buffer[];
  /**
   * The time in milliseconds after which the iccf proof expires.
   */
  importAccountTimeout: number;
  /**
   * Whether it allows any operation to import an account, rather than just the `ft4.ras_import` operation.
   */
  allowAnyOperation: boolean;
};

/**
 * The configuration for the import strategy
 */
export type ImportConfigRaw = {
  /**
   * The chains that are trusted to import accounts.
   */
  trusted_chains: Buffer[];
  /**
   * The time in milliseconds after which the iccf proof expires.
   */
  import_account_timeout: number;
  /**
   * Whether it allows any operation to import an account, rather than just the `ft4.ras_import` operation.
   */
  allow_any_operation: boolean;
};

/**
 * The result of the canImportAccount function
 */
export type CanImportAccountResult = {
  /**
   * The chain of the account that is being imported
   */
  originChain: Buffer;
  /**
   * The id of the account that is being imported
   */
  originAccountId: Buffer;
  /**
   * Whether the account requires a signature to import. If false, the account can
   * be imported without a signature, provided that a recent enough transaction is
   * found on the origin chain. This means that, even if this is false, the account
   * may still require a signature to import.
   */
  requiresSignature: boolean;
};
