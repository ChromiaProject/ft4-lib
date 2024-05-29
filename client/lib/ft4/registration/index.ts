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
  getEnabledRegistrationStrategies,
} from "./strategies";

const registrationStrategy = {
  open,
  fee,
  subscription,
  transferOpen,
  transferFee,
};

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
  getEnabledRegistrationStrategies,
  registrationStrategy,
};
