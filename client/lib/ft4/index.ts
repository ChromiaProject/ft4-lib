import { logger } from "postchain-client";
import { version } from "../../../package.json";
import {
  createKeyStoreInteractor,
  KeyStoreInteractor,
  createConnection,
} from "./ft-session";
import { op } from "./utils";

import { createSessionStorageLoginKeyStore } from "./authentication/login-manager/stores/session-storage";
import { createLocalStorageLoginKeyStore } from "./authentication/login-manager/stores/local-storage";

// Export public interfaces
import {
  KeyStore,
  createWeb3ProviderEvmKeyStore,
  createGenericEvmKeyStore,
  createInMemoryEvmKeyStore,
} from "./authentication";
import {
  AuthDescriptor,
  FlagsType,
  Account,
  authDescriptor,
  GtvAuthDescriptor,
} from "./accounts";
import { createAmount } from "./asset/amount";
import {
  registerAccount,
  addRateLimitPoints,
  registerAsset,
  mint,
  registerCrosschainAsset,
} from "./admin/admin-op-functions";
import { createEvmKeyHandler, EvmKeyStore, FtKeyStore } from "./authentication";
import { createInMemoryFtKeyStore } from "./authentication/ft/key-stores/in-memory";
import { Session } from "./types";
import {
  TransferHistoryEntry,
  TransferHistoryResponse,
  TransferHistoryType,
} from "./accounts/transfer-history/types";
import { DecimalFormat } from "./asset/types";
import {
  getAssetOriginById,
  initTransfer,
  applyTransfer,
  getInitTransferArgs,
  findPathToChainForAsset,
  PathfinderError,
} from "./crosschain";

export {
  op,
  KeyStore,
  KeyStoreInteractor,
  AuthDescriptor,
  FlagsType,
  Account,
  Session,
  DecimalFormat,
  GtvAuthDescriptor,
  TransferHistoryEntry,
  TransferHistoryResponse,
  TransferHistoryType,
  EvmKeyStore,
  FtKeyStore,
  authDescriptor,
  createConnection,
  createKeyStoreInteractor,
  createWeb3ProviderEvmKeyStore,
  createGenericEvmKeyStore,
  createInMemoryEvmKeyStore,
  createInMemoryFtKeyStore,
  createSessionStorageLoginKeyStore,
  createLocalStorageLoginKeyStore,
  createEvmKeyHandler,
  createAmount,
  registerAccount,
  addRateLimitPoints,
  registerAsset,
  mint,
  registerCrosschainAsset,
  getAssetOriginById,
  initTransfer,
  applyTransfer,
  getInitTransferArgs,
  findPathToChainForAsset,
  PathfinderError,
};

export { Listener, EventEmitter } from "./events";

export const ft = Object.freeze({
  getClientVersion: () => version,
  setLogLevel: logger.setLogLevel,
  authDescriptor,
});

ft.setLogLevel(0);
