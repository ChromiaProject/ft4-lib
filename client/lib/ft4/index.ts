import { logger } from "postchain-client";
import { version } from "../../../package.json";
import { createKeyStoreInteractor } from "./ft-session";
import { op } from "./utils";

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
  authDescriptor,
});

ft.setLogLevel(0);
