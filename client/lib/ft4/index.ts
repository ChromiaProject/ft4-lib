import { logger } from "postchain-client";
import { version } from "../../../package.json";
import { authDescriptor } from "./accounts";

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
} from "./asset";

// Accounts module
export {
  AuthDescriptor,
  FlagsType,
  Account,
  GtvAuthDescriptor,
  TransferHistoryEntry,
  TransferHistoryResponse,
  TransferHistoryType,
} from "./accounts";

// Root imports
export { Session, Connection, OptionalPageCursor } from "./types";

export {
  createConnection,
  createSession,
  createKeyStoreInteractor,
  KeyStoreInteractor,
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
  authDescriptor,
});

ft.setLogLevel(0);
