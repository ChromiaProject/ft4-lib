import { registerAccount, logoutSession } from "./main";
import {
  allowedAssets,
  pendingTransferStrategies,
  feeAssets,
  fee,
  open,
  importStrategy,
  subscription,
  transferFee,
  transferOpen,
  subscriptionAssets,
  renewSubscription,
  verifyAccount,
  canImportAccount,
  subscriptionPeriodMillis,
  transferSubscription,
  subscriptionDetails,
  hasPendingCreateAccountTransferForStrategy,
  enabledRegistrationStrategies,
  getTransferStrategyRules,
  getTransferStrategyRulesGroupedByStrategy,
  TransferStrategyRule,
  TransferStrategyRuleRaw,
  TransferStrategyRuleAmount,
  fetchLoginDetails,
  getLoginDetails,
  LoginDetails,
  getEnabledRegistrationStrategies,
  AllowListRaw,
  AssetLimitRaw,
  TransferStrategyRulePartial,
  AssetLimit,
  ImportConfigRaw,
  ImportConfig,
  TransferSenderBlockchains,
  TransferParticipants,
  TransferParticipantSingle,
  PendingTransferExpirationState,
  ImportStrategyOptions,
  CanImportAccountResult,
  getImportConfig,
  importConfig,
} from "./strategies";

/**
 * Functions that can be used to register an account
 */
export interface RegistrationStrategy {
  /**
   * Creates an account using the import strategy
   *
   * @param originBrid - the blockchain rid where the original account exists
   * @param mainAuthDescriptor - The main auth descriptor of the account to import
   * @param loginConfig - the config if the account should be created with an active session, otherwise `null`
   * @param options - the options for the import strategy
   * @returns Strategy instance that can be used to retrieve registration details
   */
  importStrategy: (
    originBrid: BufferId,
    mainAuthDescriptor: AnyAuthDescriptorRegistration,
    loginConfig?: LoginConfigOptions | null,
    options?: ImportStrategyOptions | undefined,
  ) => Strategy;
  /**
   * Registers an account using the open strategy
   *
   * @param authDescriptor - the auth descriptor of the new account
   * @param loginConfig - the config if the account should be created with an active session, otherwise `null`
   * @returns Strategy instance that can be used to retrieve registration details
   */
  open: (
    authDescriptor: AnyAuthDescriptorRegistration,
    loginConfig?: LoginConfigOptions | null,
  ) => Strategy;

  /**
   * Registers an account using the fee strategy
   * @param senderBlockchainRid - the blockchain rid from which the assets will be paid
   * @param feeAsset - the asset that will be used to pay the fee
   * @param authDescriptor - the auth descriptor of the new account
   * @param loginConfig - the config if the account should be created with an active session, otherwise `null`
   * @returns Strategy instance that can be used to retrieve registration details
   */
  fee: (
    senderBlockchainRid: BufferId,
    feeAsset: Asset,
    authDescriptor: AnyAuthDescriptorRegistration,
    loginConfig?: LoginConfigOptions | null,
  ) => Strategy;

  /**
   * Registers an account using the subscription strategy
   * @param senderBlockchainRid - the blockchain rid from which the assets will be paid
   * @param subscriptionAsset - the asset that will be used to pay the subscription
   * @param authDescriptor - the auth descriptor of the new account
   * @param loginConfig - the config if the account should be created with an active session, otherwise `null`
   * @returns Strategy instance that can be used to retrieve registration details
   */
  subscription: (
    senderBlockchainRid: BufferId,
    subscriptionAsset: Asset,
    authDescriptor: AnyAuthDescriptorRegistration,
    loginConfig?: LoginConfigOptions | null,
  ) => Strategy;

  /**
   * Creates an account that previously had assets transferred to it, without paying a fee
   * @param authDescriptor - the auth descriptor of the new account
   * @param loginConfig - the config if the account should be created with an active session, otherwise `null`
   * @returns Strategy instance that can be used to retrieve registration details
   */
  transferOpen: (
    authDescriptor: AnyAuthDescriptorRegistration,
    loginConfig?: LoginConfigOptions | null,
  ) => Strategy;

  /**
   * Creates an account that previously had assets transferred to it, and paying a fee
   * @param feeAsset - the asset in which to pay the fee. The asset needs to be present on the account
   * @param authDescriptor - the auth descriptor of the new account
   * @param loginConfig - the config if the account should be created with an active session, otherwise `null`
   * @returns Strategy instance that can be used to retrieve registration details
   */
  transferFee: (
    feeAsset: Asset,
    authDescriptor: AnyAuthDescriptorRegistration,
    loginConfig?: LoginConfigOptions | null,
  ) => Strategy;

  /**
   * Creates an account that previously had assets transferred to it, paying a subscription fee
   * @param subscriptionAsset - the asset that will be used to pay the subscription. The asset must already have been sent to the account
   * @param authDescriptor - the auth descriptor of the new account
   * @param loginConfig - the config if the account should be created with an active session, otherwise `null`
   * @returns Strategy instance that can be used to retrieve registration details
   */
  transferSubscription: (
    subscriptionAsset: Asset,
    authDescriptor: AnyAuthDescriptorRegistration,
    loginConfig?: LoginConfigOptions | null,
  ) => Strategy;
}

const registrationStrategy: RegistrationStrategy = {
  importStrategy,
  open,
  fee,
  subscription,
  transferOpen,
  transferFee,
  transferSubscription,
};

import { registerAccountMessage } from "./queries";

import { registerAccount as registerAccountOp } from "./operations";
import { Strategy } from "./types";
import { AnyAuthDescriptorRegistration } from "@ft4/accounts";
import { LoginConfigOptions } from "@ft4/authentication";
import { Asset } from "@ft4/asset";
import { BufferId } from "postchain-client";

export { Strategy, RegistrationDetails, StrategyError } from "./types";

export {
  LoginDetails,
  allowedAssets,
  renewSubscription,
  verifyAccount,
  canImportAccount,
  importStrategy,
  subscriptionDetails,
  transferSubscription,
  feeAssets,
  fetchLoginDetails,
  getLoginDetails,
  logoutSession,
  subscriptionPeriodMillis,
  pendingTransferStrategies,
  registerAccount,
  subscriptionAssets,
  hasPendingCreateAccountTransferForStrategy,
  enabledRegistrationStrategies,
  registerAccountMessage,
  registerAccountOp,
  getEnabledRegistrationStrategies,
  registrationStrategy,
  getTransferStrategyRules,
  getTransferStrategyRulesGroupedByStrategy,
  TransferStrategyRule,
  TransferStrategyRuleRaw,
  TransferStrategyRuleAmount,
  AllowListRaw,
  AssetLimitRaw,
  TransferStrategyRulePartial,
  AssetLimit,
  TransferSenderBlockchains,
  TransferParticipants,
  TransferParticipantSingle,
  PendingTransferExpirationState,
  ImportConfigRaw,
  ImportConfig,
  CanImportAccountResult,
  getImportConfig,
  importConfig,
};
