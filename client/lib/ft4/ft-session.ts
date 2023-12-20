import { Buffer } from "buffer";
import {
  DictPair,
  IClient,
  Operation,
  QueryCallback,
  QueryObject,
  RawGtv,
  TransactionReceipt,
} from "postchain-client";
import { createAuthenticatedAccount } from "./accounts/account-op-functions";
import {
  createAccountObject,
  getByAuthDescriptorId,
  getById,
  getBySigner,
} from "./accounts/account-query-functions";
import {
  getAllAssets,
  getAssetById,
  getAssetBySymbol,
  getAssetsByName,
} from "./asset/asset-query-functions";
import {
  AuthDataService,
  Authenticator,
  KeyStore,
  createAuthenticator,
} from "./authentication";
import { createLoginManager } from "./authentication/login-manager";
import { LoginKeyStore } from "./authentication/login-manager/stores/types";
import {
  authFlags,
  authMessageTemplate,
  loginConfig,
  nonce,
} from "./authentication/queries";
import { ftEventEmitter } from "./events";
import {
  Connection,
  KeyStoreInteractor,
  OptionalPageCursor,
  Session,
} from "./types";
import { getConfig, getVersion, nop } from "./utils";
import { fetchExposedOperations } from "./utils/exposed-operations";
import { transactionBuilder } from "./utils/transaction-builder";
import { BufferId } from "./utils/types";
import { getTransferDetails } from "./accounts/transfer-history/transfer-history-query-functions";
import { getTransferDetailsByAsset } from "./accounts/transfer-history/transfer-history-query-functions";

export function createConnection(client: IClient): Connection {
  const connection = Object.freeze({
    client,
    query: <TReturn extends RawGtv, TArgs extends DictPair | undefined>(
      nameOrQueryObject: string | QueryObject<TReturn, TArgs>,
      args?: TArgs,
      callback?: QueryCallback<TReturn>,
    ) => query<TReturn, TArgs>(connection, nameOrQueryObject, args, callback),
    getConfig: () => getConfig(client),
    getVersion: () => getVersion(client),

    getAccountById: (id: BufferId) => getById(connection, id),
    getAccountsBySigner: (
      id: BufferId,
      limit?: number,
      cursor: OptionalPageCursor = null,
    ) => getBySigner(connection, id, limit, cursor),
    getAccountsByAuthDescriptorId: (
      id: BufferId,
      limit?: number,
      cursor?: OptionalPageCursor,
    ) => getByAuthDescriptorId(connection, id, limit, cursor),
    getAssetById: (id: BufferId) => getAssetById(connection, id),
    getAssetBySymbol: (symbol: string) => getAssetBySymbol(connection, symbol),
    getAssetsByName: (
      name: string,
      limit?: number,
      cursor?: OptionalPageCursor,
    ) => getAssetsByName(connection, name, limit, cursor),
    getAllAssets: (limit?: number, cursor: OptionalPageCursor = null) =>
      getAllAssets(connection, limit, cursor),
    getTransferDetails: (txRid: BufferId, opIndex: number) =>
      getTransferDetails(connection, txRid, opIndex),
    getTransferDetailsByAsset: (
      txRid: BufferId,
      opIndex: number,
      assetId: BufferId,
    ) => getTransferDetailsByAsset(connection, txRid, opIndex, assetId),
  });

  return connection;
}

export function createSession(
  connection: Connection,
  authenticator: Authenticator,
): Session {
  return Object.freeze({
    account: createAuthenticatedAccount(connection, authenticator),
    transactionBuilder: () =>
      transactionBuilder(authenticator, connection.client),
    call: (...operations: Operation[]) =>
      call(connection, authenticator, ...operations),
    callWithoutNop: (...operations: Operation[]) =>
      callWithoutNop(connection, authenticator, ...operations),
    ...connection,
  });
}

async function query<
  TReturn extends RawGtv,
  TArgs extends DictPair | undefined,
>(
  connection: Connection,
  nameOrQueryObject: string | QueryObject<TReturn, TArgs>,
  args?: TArgs,
  callback?: QueryCallback<TReturn>,
): Promise<TReturn> {
  return await connection.client.query(nameOrQueryObject, args, callback);
}

export function call(
  connection: Connection,
  authenticator: Authenticator,
  ...operations: Operation[]
): Promise<TransactionReceipt> {
  return callWithoutNop(connection, authenticator, ...operations, nop());
}

export async function callWithoutNop(
  connection: Connection,
  authenticator: Authenticator,
  ...operations: Operation[]
): Promise<TransactionReceipt> {
  const tb = transactionBuilder(authenticator, connection.client);
  operations.forEach((operation: Operation) => tb.add(operation));
  const tx = await tb.build();
  return connection.client.sendTransaction(tx);
}

export function createAuthDataService(connection: Connection): AuthDataService {
  let exposedOperations: Set<string> | null = null;

  const fetchAndCacheOperations = async () => {
    exposedOperations = await fetchExposedOperations(connection);
  };

  return Object.freeze({
    isOperationExposed: async (operationName: string): Promise<boolean> => {
      if (!exposedOperations) {
        await fetchAndCacheOperations();
      }
      return exposedOperations!.has(operationName);
    },
    getAuthFlags: async (operation: Operation) => {
      return await connection.query(authFlags(operation));
    },
    getAuthMessageTemplate: async (operation: Operation) => {
      return await connection.query(authMessageTemplate(operation));
    },
    getNonce: async (accountId: BufferId, authDescriptorId: BufferId) =>
      connection.query(nonce(accountId, authDescriptorId)),
    getLoginConfig: async (configName: string | undefined = undefined) =>
      connection.query(loginConfig(configName)),
    getBrid: () => Buffer.from(connection.client.config.blockchainRid, "hex"),
  });
}

export function createKeyStoreInteractor(
  client: IClient,
  keyStore: KeyStore,
): KeyStoreInteractor {
  const connection = createConnection(client);
  return Object.freeze({
    getAccounts: async () =>
      (await connection.getAccountsBySigner(keyStore.id)).data,
    getAccountsPaginated: async (
      limit: number,
      cursor: OptionalPageCursor = null,
    ) => connection.getAccountsBySigner(keyStore.id, limit, cursor),
    getSession: async (accountId: Buffer) => {
      const account = createAccountObject(connection, accountId);
      const authDescriptors = await account.getAuthDescriptorsBySigner(
        keyStore.id,
      );
      const keyHandlers = authDescriptors.data.map((authDescriptor) =>
        keyStore.createKeyHandler(authDescriptor),
      );
      const authenticator = createAuthenticator(
        accountId,
        keyHandlers,
        createAuthDataService(connection),
      );

      return createSession(connection, authenticator);
    },
    getLoginManager: (loginKeyStore?: LoginKeyStore) =>
      createLoginManager(connection, keyStore, loginKeyStore),
    onKeyStoreChanged: async (handler: (arg0: KeyStoreInteractor) => void) => {
      ftEventEmitter.on("KeyStoreChange", (newKeyStore: KeyStore) =>
        handler(createKeyStoreInteractor(client, newKeyStore)),
      );
    },
  });
}
