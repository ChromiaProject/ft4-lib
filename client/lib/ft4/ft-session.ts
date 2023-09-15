import { Account } from "./accounts/types";
import { Connection, Session, OptionalPageCursor } from "./types";
import { getConfig, getVersion, nop } from "./utils";
import { BufferId } from "../cryptoUtils";
import {
  getByParticipantId,
  getById,
  createAccountObject,
  getByAuthDescriptorId,
} from "./accounts/account-query-functions";
import {
  getAssetById,
  getAssetBySymbol,
  getAllAssets,
  getAssetsByName,
} from "./asset/asset-query-functions";
import { createAuthenticatedAccount } from "./accounts/account-op-functions";
import { transactionBuilder } from "./utils/transaction-builder";
import {
  AuthDataService,
  Authenticator,
  KeyStore,
  LoginConfig,
} from "./authentication/types";
import { createAuthenticator } from "./authentication";
import {
  authFlags,
  authMessageTemplate,
  loginConfig,
  nonce,
} from "./authentication/queries";
import {
  LoginManger,
  createLoginManager,
} from "./authentication/login-manager";
import {
  IClient,
  QueryObject,
  RawGtv,
  QueryArguments,
  Operation,
  TransactionReceipt,
} from "postchain-client";
import { Buffer } from "buffer";
import { LoginKeyStore } from "./authentication/login-manager/stores/types";
import { fetchExposedOperations } from "./utils/exposed-operations";
import { ftEventEmitter } from "./events";

export function createConnection(client: IClient): Connection {
  const connection = Object.freeze({
    client,
    query: <T extends RawGtv>(queryObject: QueryObject<QueryArguments>) =>
      query<T>(connection, queryObject),
    getConfig: () => getConfig(client),
    getVersion: () => getVersion(client),

    getAccountById: (id: BufferId) => getById(connection, id),
    getAccountsByParticipantId: (id: BufferId) =>
      getByParticipantId(connection, id),
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

async function query<T extends RawGtv>(
  connection: Connection,
  queryObject: QueryObject<QueryArguments>,
): Promise<T | null> {
  return await connection.client.query<QueryArguments, T>(queryObject);
}

export async function call(
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

export type KeyStoreInteractor = {
  getAccounts(): Promise<Account[]>;
  getSession(accountId: BufferId): Promise<Session>;
  getLoginManager(loginKeyStore?: LoginKeyStore): LoginManger;
  onKeyStoreChanged(callback: (newKeyStore: KeyStoreInteractor) => void): void;
};

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
      return (await connection.query<string[]>(authFlags(operation))) ?? [];
    },
    getAuthMessageTemplate: async (operation: Operation) => {
      return (
        (await connection.query<string>(authMessageTemplate(operation))) ?? ""
      );
    },
    getNonce: async (accountId: BufferId, authDescriptorId: BufferId) =>
      connection.query<number>(nonce(accountId, authDescriptorId)),
    getLoginConfig: async (configName: string | undefined = undefined) =>
      connection.query<LoginConfig>(loginConfig(configName)),
    getBrid: () => Buffer.from(connection.client.config.blockchainRID, "hex"),
  });
}

export function createKeyStoreInteractor(
  client: IClient,
  keyStore: KeyStore,
): KeyStoreInteractor {
  const connection = createConnection(client);
  return Object.freeze({
    getAccounts: async () => connection.getAccountsByParticipantId(keyStore.id),
    getSession: async (accountId: Buffer) => {
      const account = createAccountObject(connection, accountId);
      const authDescriptors = await account.getAuthDescriptorsByParticipantId(
        keyStore.id,
      );
      const keyHandlers = authDescriptors.map((authDescriptor) =>
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
      ftEventEmitter.on("KeyStoreChanged", (newKeyStore: KeyStore) =>
        handler(createKeyStoreInteractor(client, newKeyStore)),
      );
    },
  });
}
