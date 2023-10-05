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
import {
  DecimalFormat,
  Asset,
  Balance,
  SupportedNumber,
  createAmount,
} from "./asset";
import {
  registerAccount,
  addRateLimitPoints,
  registerAsset,
  mint,
} from "./admin/admin-op-functions";
import { createEvmKeyHandler, EvmKeyStore, FtKeyStore } from "./authentication";
import { createInMemoryFtKeyStore } from "./authentication/ft/key-stores/in-memory";
import { Session, Connection } from "./types";
import {
  TransferHistoryEntry,
  TransferHistoryResponse,
  TransferHistoryType,
} from "./accounts/transfer-history/types";

export {
  op,
  KeyStore,
  KeyStoreInteractor,
  AuthDescriptor,
  FlagsType,
  Account,
  Session,
  Connection,
  DecimalFormat,
  Asset,
  Balance,
  SupportedNumber,
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
};

export { Listener, EventEmitter } from "./events";

export const ft = Object.freeze({
  getClientVersion: () => version,
  setLogLevel: logger.setLogLevel,
  authDescriptor,
});

ft.setLogLevel(0);
