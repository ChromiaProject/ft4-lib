import { logger } from "postchain-client";
import { version } from "../../../package.json";
import { createKeyStoreInteractor } from "./ft-session";
import { op } from "./utils";

import { createSessionStorageLoginKeyStore } from "./authentication/login-manager/stores/session-storage";
import { createLocalStorageLoginKeyStore } from "./authentication/login-manager/stores/local-storage";

// Export public interfaces
import { KeyStore, createWeb3ProviderEvmKeyStore } from "./authentication";
import { AuthDescriptor, FlagsType, Account, authDescriptor } from "./accounts";
import { createAmount } from "./asset/amount";
import { createEvmKeyHandler } from "./authentication";

export {
  op,
  KeyStore,
  AuthDescriptor,
  FlagsType,
  Account,
  authDescriptor,
  createKeyStoreInteractor,
  createWeb3ProviderEvmKeyStore,
  createSessionStorageLoginKeyStore,
  createLocalStorageLoginKeyStore,
  createEvmKeyHandler,
  createAmount,
};

export const ft = Object.freeze({
  getClientVersion: () => version,
  setLogLevel: logger.setLogLevel,
  authDescriptor,
});

ft.setLogLevel(0);
