export {
  LoginConfigComplexRule,
  LoginConfigRules,
  LoginConfigRuleVariable,
  LoginConfigRelativeRuleVariable,
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
  Signer,
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
  RawSignature,
  EvmSigner,
  Eip1193Provider,
  createGenericEvmKeyStore,
  createInMemoryEvmKeyStore,
  createWeb3ProviderEvmKeyStore,
  createEvmKeyHandler,
  signMessage,
  sliceSignature,
  toRawSignature,
  isEvmKeyStore,
  isEvmSigner,
  evmSigner,
  evmAuth,
  BLOCKCHAIN_RID_PLACEHOLDER,
  ACCOUNT_ID_PLACEHOLDER,
  AUTH_DESCRIPTOR_ID_PLACEHOLDER,
  NONCE_PLACEHOLDER,
  EVM_AUTH,
} from "./evm";

export {
  FtKeyStore,
  FtSigner,
  ftAuth,
  createInMemoryFtKeyStore,
  createFtKeyHandler,
  ftSigner,
  isFtKeyStore,
  isFtSigner,
  FT_AUTH,
} from "./ft";

export { createNoopAuthenticator, noopAuthenticator } from "./noop";

export {
  createAuthenticator,
  hasAuthDescriptorFlags,
  getKeyHandlersForKeyStores,
  isAuthOperation,
} from "./main";

export {
  authDescriptorCounter,
  authMessageTemplate,
  authFlags,
} from "./queries";
