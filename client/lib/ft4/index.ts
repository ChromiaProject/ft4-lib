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
  minutes,
  hours,
  days,
  weeks,
  LoginConfigSimpleRule,
  LoginConfigRules,
  ttlLoginRule,
  authDescriptorRuleToLoginConfigAndRule,
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
  FlagsType,
  Account,
  MultiSig,
  RateLimit,
  RuleOperator,
  RuleVariable,
  SingleSig,
  TransferHistoryEntry,
  TransferHistoryType,
  deriveAuthDescriptorId,
  createSingleSigAuthDescriptorRegistration,
  createMultiSigAuthDescriptorRegistration,
  aggregateSigners,
  blockHeight,
  blockTime,
  opCount,
  lessThan,
  lessOrEqual,
  equals,
  greaterThan,
  greaterOrEqual,
  and,
} from "./accounts";

// Root imports
export {
  Session,
  Connection,
  KeyStoreInteractor,
  OptionalPageCursor,
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
  Orchestrator,
  OrchestratorEvents,
  PathfinderError,
  applyTransfer,
  createOrchestrator,
  findPathToChainForAsset,
  getAssetOriginById,
  initTransfer,
} from "./crosschain";

export const ft = Object.freeze({
  setLogLevel: logger.setLogLevel,
});

ft.setLogLevel(0);
