import { logger } from "postchain-client";

// Authentication module
export {
  KeyStore,
  KeyHandler,
  EvmKeyStore,
  FtKeyStore,
  createAuthenticator,
  createGenericEvmKeyStore,
  createInMemoryEvmKeyStore,
  createInMemoryFtKeyStore,
  createLocalStorageLoginKeyStore,
  createSessionStorageLoginKeyStore,
  createWeb3ProviderEvmKeyStore,
  createEvmKeyHandler,
  LoginConfigComplexRule,
  LoginConfigSimpleRule,
  LoginConfigRules,
  SigningError,
  mapLoginConfigRulesToAuthDescriptorRules,
  blockHeight,
  relativeBlockHeight,
  blockTime,
  relativeBlockTime,
  opCount,
  minutes,
  hours,
  days,
  weeks,
  ttlLoginRule,
} from "./authentication";

// Admin module
export {
  registerAccount,
  addRateLimitPoints,
  registerAsset,
  mint,
  registerCrosschainAsset,
} from "./admin";

// Asset module
export {
  Amount,
  DecimalFormat,
  Asset,
  Balance,
  SupportedNumber,
  createAmount,
  createAmountFromBalance,
  createAssetObject,
} from "./asset";

// Accounts module
export {
  AuthDescriptor,
  AnyAuthDescriptor,
  AnyAuthDescriptorRegistration,
  AuthDescriptorError,
  AuthDescriptorRegistration,
  AuthDescriptorRules,
  AuthDescriptorSimpleRule,
  AuthDescriptorComplexRule,
  AuthType,
  AuthFlag,
  Account,
  MultiSig,
  RateLimit,
  RuleOperator,
  SingleSig,
  TransferHistoryEntry,
  TransferHistoryType,
  deriveAuthDescriptorId,
  createSingleSigAuthDescriptorRegistration,
  createMultiSigAuthDescriptorRegistration,
  aggregateSigners,
  lessThan,
  lessOrEqual,
  equals,
  greaterThan,
  greaterOrEqual,
  and,
  createAuthDescriptorValidator,
} from "./accounts";

// Root imports
export {
  Session,
  Connection,
  KeyStoreInteractor,
  OptionalPageCursor,
  OptionalLimit,
} from "./types";

export {
  createConnection,
  createSession,
  createKeyStoreInteractor,
} from "./ft-session";

// Utils & Others
export {
  op,
  retrievePaginatedEntity,
  EntityRetriever,
  PaginatedEntity,
} from "./utils";

export { Listener, EventEmitter } from "./events";

// Crosschain
export {
  PendingTransfer,
  getAssetOriginById,
  getPendingTransfersForAccount,
  isTransferApplied,
  initTransfer,
  applyTransfer,
  completeTransfer,
} from "./crosschain";

import * as accountRegistration from "@ft4/accounts/registration";
import * as openStrategy from "@ft4/accounts/registration/strategies/open";
import * as transferStrategy from "@ft4/accounts/registration/strategies/transfer";
import * as transferOpenStrategy from "@ft4/accounts/registration/strategies/transfer/open";
import * as transferFeeStrategy from "@ft4/accounts/registration/strategies/transfer/fee";

export const registration = Object.freeze({
  registerAccount: accountRegistration.registerAccount,
  strategy: Object.freeze({
    open: openStrategy.open,
    transferOpen: transferOpenStrategy.transferOpen,
    transferFee: transferFeeStrategy.transferFee,
  }),
  query: Object.freeze({
    allowedAssets: transferStrategy.allowedAssets,
    pendingTransferStrategies: transferStrategy.pendingTransferStrategies,
    feeAssets: transferFeeStrategy.feeAssets,
  }),
});

export const ft = Object.freeze({
  setLogLevel: logger.setLogLevel,
});

ft.setLogLevel(logger.LogLevel.Disabled);
