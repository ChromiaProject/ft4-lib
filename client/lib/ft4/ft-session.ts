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
import { AppStructure, getAppStructureQuery } from "./queries";

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
  exposedOperations?: Set<string>,
): Session {
  return Object.freeze({
    account: createAuthenticatedAccount(connection, authenticator),
    transactionBuilder: () =>
      transactionBuilder(authenticator, connection.client, exposedOperations),
    call: (...operations: Operation[]) =>
      call(connection, authenticator, exposedOperations, ...operations),
    callWithoutNop: (...operations: Operation[]) =>
      callWithoutNop(
        connection,
        authenticator,
        exposedOperations,
        ...operations,
      ),
    ...connection,
  });
}

async function query<T extends RawGtv>(
  connection: Connection,
  queryObject: QueryObject<QueryArguments>,
): Promise<T | null> {
  return await connection.client.query<QueryArguments, T>(queryObject);
}

async function fetchExposedOperations(
  connection: Connection,
): Promise<Set<string>> {
  const appStructureQuery = getAppStructureQuery();
  const appStructure = await connection.query<AppStructure>(appStructureQuery);

  if (!appStructure || !appStructure.modules) {
    throw new Error("Failed to fetch the app structure from Rell");
  }

  const exposedOperations = new Set<string>();

  for (const module of appStructure.modules) {
    if (module.operations) {
      for (const operation in module.operations) {
        exposedOperations.add(operation);
      }
    }
  }
  return exposedOperations;
}

export async function call(
  connection: Connection,
  authenticator: Authenticator,
  exposedOperations?: Set<string>,
  ...operations: Operation[]
): Promise<TransactionReceipt> {
  return callWithoutNop(
    connection,
    authenticator,
    exposedOperations,
    ...operations,
    nop(),
  );
}

export async function callWithoutNop(
  connection: Connection,
  authenticator: Authenticator,
  exposedOperations?: Set<string>,
  ...operations: Operation[]
): Promise<TransactionReceipt> {
  const tb = transactionBuilder(
    authenticator,
    connection.client,
    exposedOperations,
  );
  operations.forEach((operation: Operation) => tb.add(operation));
  const tx = await tb.build();
  return connection.client.sendTransaction(tx);
}

export type KeyStoreInteractor = {
  getAccounts(): Promise<Account[]>;
  getSession(accountId: BufferId): Promise<Session>;
  getLoginManager(loginKeyStore?: LoginKeyStore): LoginManger;
};

// TODO: Improve error handling
// Use `rell.get_app_structure` to get exposed queries (FT3-99)
export function createAuthDataService(connection: Connection): AuthDataService {
  return Object.freeze({
    getAuthFlags: async (operation: Operation) => {
      return await connection.query<string[]>(authFlags(operation));
    },
    getAuthMessageTemplate: async (operation: Operation) => {
      return await connection.query<string>(authMessageTemplate(operation));
    },
    getNonce: async (accountId: BufferId, authDescriptorId: BufferId) =>
      connection.query<number>(nonce(accountId, authDescriptorId)),
    getLoginConfig: async (configName: string | null = null) =>
      connection.query<LoginConfig>(loginConfig(configName)),
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

      const exposedOperations = await fetchExposedOperations(connection);

      return createSession(connection, authenticator, exposedOperations);
    },
    getLoginManager: (loginKeyStore?: LoginKeyStore) =>
      createLoginManager(connection, keyStore, loginKeyStore),
  });
}
