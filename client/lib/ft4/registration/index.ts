import { registerAccount, logoutSession } from "./main";
import {
  allowedAssets,
  pendingTransferStrategies,
  feeAssets,
  fee,
  open,
  subscription,
  transferFee,
  transferOpen,
  subscriptionAssets,
  renewSubscription,
  subscriptionPeriodMillis,
  transferSubscription,
  subscriptionDetails,
  hasPendingCreateAccountTransferForStrategy,
  enabledRegistrationStrategies,
  fetchLoginDetails,
  getLoginDetails,
} from "./strategies";

export interface RegistrationStrategy {
  open: (
    authDescriptor: AnyAuthDescriptorRegistration,
    loginConfig?: LoginConfigOptions | null,
  ) => Strategy;
  fee: (
    senderBlockchainRid: BufferId,
    feeAsset: Asset,
    authDescriptor: AnyAuthDescriptorRegistration,
    loginConfig?: LoginConfigOptions | null,
  ) => Strategy;
  subscription: (
    senderBlockchainRid: BufferId,
    subscriptionAsset: Asset,
    authDescriptor: AnyAuthDescriptorRegistration,
    loginConfig?: LoginConfigOptions | null,
  ) => Strategy;
  transferOpen: (
    authDescriptor: AnyAuthDescriptorRegistration,
    loginConfig?: LoginConfigOptions | null,
  ) => Strategy;
  transferFee: (
    feeAsset: Asset,
    authDescriptor: AnyAuthDescriptorRegistration,
    loginConfig?: LoginConfigOptions | null,
  ) => Strategy;
}

const registrationStrategy: RegistrationStrategy = {
  open,
  fee,
  subscription,
  transferOpen,
  transferFee,
};

import { registerAccountMessage } from "./queries";

import { registerAccount as registerAccountOp } from "./operations";
import { Strategy } from "./types";
import { AnyAuthDescriptorRegistration } from "@ft4/accounts";
import { LoginConfigOptions } from "@ft4/authentication";
import { Asset } from "@ft4/asset";
import { BufferId } from "@ft4/utils";

export { Strategy, RegistrationDetails, StrategyError } from "./types";

export {
  allowedAssets,
  renewSubscription,
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
  registrationStrategy,
};
