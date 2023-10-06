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
  EvmKeyStore,
  FtKeyStore,
  createEvmKeyHandler,
} from "./authentication";
import { Account } from "./accounts";
import {
  AnyAuthDescriptor,
  FlagsType,
  SingleSig,
  MultiSig,
  AnySig,
  AuthType,
  AuthDescriptor,
  RuleVariable,
  RuleOperator,
  AuthDescriptorError,
  SimpleRuleExpression,
  CompositeRuleExpression,
  AuthDescriptorRule,
  AuthDescriptorRegistration,
  AnyAuthDescriptorRegistration,
  SingleSigAuthDescriptorArgs,
  MultiSigAuthDescriptorArgs,
  aggregateSigners,
  createCompositeRule,
  createSimpleRule,
  createMultiSignatureAuthDescriptorRegistration,
  createSingleSignatureAuthDescriptorRegistration,
} from "./accounts/auth-descriptor";
import { createAmount } from "./asset/amount";
import {
  registerAccount,
  addRateLimitPoints,
  registerAsset,
  mint,
  registerCrosschainAsset,
} from "./admin/admin-op-functions";
import { createInMemoryFtKeyStore } from "./authentication/ft/key-stores/in-memory";
import { Session, Connection } from "./types";
import {
  TransferHistoryEntry,
  TransferHistoryResponse,
  TransferHistoryType,
} from "./accounts/transfer-history/types";
import { DecimalFormat } from "./asset/types";

export {
  op,
  KeyStore,
  KeyStoreInteractor,
  AuthDescriptor,
  FlagsType,
  AnyAuthDescriptor,
  SingleSig,
  MultiSig,
  AnySig,
  AuthType,
  RuleVariable,
  RuleOperator,
  AuthDescriptorError,
  SimpleRuleExpression,
  CompositeRuleExpression,
  AuthDescriptorRule,
  AuthDescriptorRegistration,
  AnyAuthDescriptorRegistration,
  SingleSigAuthDescriptorArgs,
  MultiSigAuthDescriptorArgs,
  Account,
  Session,
  Connection,
  DecimalFormat,
  TransferHistoryEntry,
  TransferHistoryResponse,
  TransferHistoryType,
  EvmKeyStore,
  FtKeyStore,
  createSingleSignatureAuthDescriptorRegistration,
  createMultiSignatureAuthDescriptorRegistration,
  createSimpleRule,
  createCompositeRule,
  aggregateSigners,
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
};

export { Listener, EventEmitter } from "./events";

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
