import { logger } from "postchain-client";
import { version } from "./package.json";

// Authentication module
export {
  KeyStore,
  KeyHandler,
  EvmKeyStore,
  FtKeyStore,
  createAuthenticator,
  createWeb3ProviderEvmKeyStore,
  createGenericEvmKeyStore,
  createInMemoryEvmKeyStore,
  createInMemoryFtKeyStore,
  createSessionStorageLoginKeyStore,
  createLocalStorageLoginKeyStore,
  createEvmKeyHandler,
  minutes,
  hours,
  days,
  weeks,
  LoginConfigSimpleRule,
  LoginConfigNullRule,
  LoginConfigRule,
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
  // TODO: Remove this export by merging
  // [Refactor auth descriptor model](https://bitbucket.org/chromawallet/ft3-lib/pull-requests/266)
  authDescriptor,
  FlagsType,
  Account,
  GtvAuthDescriptor,
  TransferHistoryEntry,
  TransferHistoryResponse,
  TransferHistoryType,
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
  getClientVersion: () => version,
  setLogLevel: logger.setLogLevel,
});

ft.setLogLevel(0);
