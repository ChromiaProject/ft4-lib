export {
  LoginConfigComplexRule,
  LoginConfigRules,
  LoginConfigSimpleRule,
  LoginKeyStore,
  LoginOptions,
  LoginConfigOptions,
  SessionWithLogout,
  LoginConfig,
  mapLoginConfigRulesToAuthDescriptorRules,
  deleteDisposableAuthDescriptors,
  createLocalStorageLoginKeyStore,
  createSessionStorageLoginKeyStore,
  createInMemoryLoginKeyStore,
  relativeBlockHeight,
  relativeBlockTime,
  minutes,
  hours,
  days,
  weeks,
  ttlLoginRule,
  getLoginConfig,
  login,
  getConfigFromOptions,
} from "./login";

export {
  KeyStore,
  KeyHandler,
  AuthDataService,
  Authenticator,
  KeyHandlerError,
  AuthHandler,
  SigningError,
} from "./types";

export {
  Signature,
  EvmKeyStore,
  Eip1193Provider,
  createGenericEvmKeyStore,
  createInMemoryEvmKeyStore,
  createWeb3ProviderEvmKeyStore,
  createEvmKeyHandler,
  signMessage,
  sliceSignature,
  evmAuth,
} from "./evm";

export {
  FtKeyStore,
  ftAuth,
  createInMemoryFtKeyStore,
  createFtKeyHandler,
  isFtKeyStore,
} from "./ft";

export { createNoopAuthenticator } from "./noop";

export {
  createAuthenticator,
  hasAuthDescriptorFlags,
  getKeyHandlersForKeyStores,
} from "./main";

export { nonce, authMessageTemplate, authFlags } from "./queries";
