import { logger } from "postchain-client";
import { version } from "../../../package.json";
import {
  KeyStoreInteractor,
  createConnection,
  createKeyStoreInteractor,
} from "./ft-session";
import { op } from "./utils";

import { createLocalStorageLoginKeyStore } from "./authentication/login-manager/stores/local-storage";
import { createSessionStorageLoginKeyStore } from "./authentication/login-manager/stores/session-storage";

// Export public interfaces
import { Account } from "./accounts";
import {
  AnyAuthDescriptor,
  AnyAuthDescriptorRegistration,
  AnySig,
  AuthDescriptor,
  AuthDescriptorError,
  AuthDescriptorRegistration,
  AuthDescriptorRule,
  AuthType,
  CompositeRuleExpression,
  FlagsType,
  MultiSig,
  MultiSigAuthDescriptorArgs,
  RuleOperator,
  RuleVariable,
  SimpleRuleExpression,
  SingleSig,
  SingleSigAuthDescriptorArgs,
  aggregateSigners,
  createCompositeRule,
  createMultiSignatureAuthDescriptorRegistration,
  createSimpleRule,
  createSingleSignatureAuthDescriptorRegistration,
  deriveAccountId,
} from "./accounts/auth-descriptor";
import {
  TransferHistoryEntry,
  TransferHistoryResponse,
  TransferHistoryType,
} from "./accounts/transfer-history/types";
import {
  addRateLimitPoints,
  mint,
  registerAccount,
  registerAsset,
  registerCrosschainAsset,
} from "./admin/admin-op-functions";
import { DecimalFormat, createAmount } from "./asset";
import {
  EvmKeyStore,
  FtKeyStore,
  KeyStore,
  createEvmKeyHandler,
  createGenericEvmKeyStore,
  createInMemoryEvmKeyStore,
  createWeb3ProviderEvmKeyStore,
} from "./authentication";
import { createInMemoryFtKeyStore } from "./authentication/ft/key-stores/in-memory";
import { Connection, Session } from "./types";

export {
  Account,
  AnyAuthDescriptor,
  AnyAuthDescriptorRegistration,
  AnySig,
  AuthDescriptor,
  AuthDescriptorError,
  AuthDescriptorRegistration,
  AuthDescriptorRule,
  AuthType,
  CompositeRuleExpression,
  Connection,
  DecimalFormat,
  EvmKeyStore,
  FlagsType,
  FtKeyStore,
  KeyStore,
  KeyStoreInteractor,
  MultiSig,
  MultiSigAuthDescriptorArgs,
  RuleOperator,
  RuleVariable,
  Session,
  SimpleRuleExpression,
  SingleSig,
  SingleSigAuthDescriptorArgs,
  TransferHistoryEntry,
  TransferHistoryResponse,
  TransferHistoryType,
  addRateLimitPoints,
  aggregateSigners,
  createAmount,
  createCompositeRule,
  createConnection,
  createEvmKeyHandler,
  createGenericEvmKeyStore,
  createInMemoryEvmKeyStore,
  createInMemoryFtKeyStore,
  createKeyStoreInteractor,
  createLocalStorageLoginKeyStore,
  createMultiSignatureAuthDescriptorRegistration,
  createSessionStorageLoginKeyStore,
  createSimpleRule,
  createSingleSignatureAuthDescriptorRegistration,
  createWeb3ProviderEvmKeyStore,
  deriveAccountId,
  mint,
  op,
  registerAccount,
  registerAsset,
  registerCrosschainAsset,
};

export { EventEmitter, Listener } from "./events";

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
