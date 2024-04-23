import { registerAccount } from "./main";
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
  subscriptionPeriodMillis,
  pendingTransferStrategies,
  registerAccount,
  subscriptionAssets,
  hasPendingCreateAccountTransferForStrategy,
  enabledRegistrationStrategies,
  registrationStrategy,
};
