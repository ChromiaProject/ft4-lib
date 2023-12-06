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
  AnySig,
  AuthDescriptorError,
  AuthDescriptorRegistration,
  AuthDescriptorRule,
  ComplexAuthDescriptorRule,
  AuthDescriptorAndRule,
  AuthType,
  FlagsType,
  Account,
  MultiSig,
  MultiSigAuthDescriptorArgs,
  RuleOperator,
  RuleVariable,
  SingleSig,
  SingleSigAuthDescriptorArgs,
  TransferHistoryEntry,
  TransferHistoryResponse,
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
export { op } from "./utils";
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
