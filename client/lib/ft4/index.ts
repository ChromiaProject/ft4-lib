import { logger } from "postchain-client";
import { version } from "../../../package.json";
import {
  createQuerySession,
  createUserSession,
  createKeyStoreInteractor,
} from "./ft-session";
import { _op as op } from "./utils";

// Export public interfaces
import { KeyStore, createWeb3ProviderEvmKeyStore } from "./authentication";
import { AuthDescriptor, FlagsType, Account, authDescriptor } from "./accounts";
import { createAmount } from "./asset/amount";

export {
  op,
  KeyStore,
  AuthDescriptor,
  FlagsType,
  Account,
  authDescriptor,
  createKeyStoreInteractor,
  createWeb3ProviderEvmKeyStore,
  createAmount,
};

export const ft = Object.freeze({
  getClientVersion: () => version,
  setLogLevel: logger.setLogLevel,
  createUserSession,
  createQuerySession,
  authDescriptor,
});

ft.setLogLevel(0);
