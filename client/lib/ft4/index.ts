import { logger } from "postchain-client";
import { version } from "../../../package.json";
import {
  createQuerySession,
  createUserSession,
  createKeyStoreInteractor,
} from "./ft-session";

// Export public interfaces
import { KeyStore, createWeb3ProviderEVMKeyStore } from "./authentication";
import { AuthDescriptor, FlagsType, IAccount, authDescriptor } from "./account";

export {
  KeyStore,
  AuthDescriptor,
  FlagsType,
  IAccount,
  authDescriptor,
  createKeyStoreInteractor,
  createWeb3ProviderEVMKeyStore,
};

export const ft = Object.freeze({
  getClientVersion: () => version,
  setLogLevel: logger.setLogLevel,
  createUserSession,
  createQuerySession,
  authDescriptor,
});

ft.setLogLevel(0);
