import { accountQuerySession, accountUserSession } from "./accounts";
import { IAccount, User } from "./accounts/types";
import { assetQuerySession, assetUserSession } from "./asset";
import {
  ftQuerySession,
  ftUserSession,
  Connection,
  Session,
  OptionalPageCursor,
} from "./types";
import { _getConfig, getVersion, _nop as nop } from "./utils";
import { BufferId } from "../cryptoUtils";
import {
  _getByParticipantId,
  _getById,
  createAccountObject,
  _getByAuthDescriptorId,
} from "./accounts/account-query-functions";
import {
  _getAssetById,
  _getAssetBySymbol,
  getAllAssets,
  _getAssetsByName,
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
  GtxClient,
  QueryArguments,
  Operation,
  TransactionReceipt,
} from "postchain-client";
import { Buffer } from "buffer";
import { LoginKeyStore } from "./authentication/login-manager/stores/types";

export function createUserSession(pci: GtxClient, user: User): ftUserSession {
  return Object.freeze({
    user,
    changeUser: (newUser: User) => createUserSession(pci, newUser),
    get: createQuerySession(pci),
    account: accountUserSession(user, pci),
    ...assetUserSession(user, pci),
  });
}

export function createQuerySession(pci: GtxClient): ftQuerySession {
  return Object.freeze({
    gtxClient: pci,
    createUserSession: (user: User) => createUserSession(pci, user),
    account: accountQuerySession(pci),
    ...assetQuerySession(pci),
  });
}

export function createConnection(client: IClient): Connection {
  const connection = Object.freeze({
    client,
    query: <T extends RawGtv>(queryObject: QueryObject<QueryArguments>) =>
      query<T>(connection, queryObject),
    getConfig: () => _getConfig(client),
    getVersion: () => getVersion(client),

    getAccountById: (id: BufferId) => _getById(connection, id),
    getAccountsByParticipantId: (id: BufferId) =>
      _getByParticipantId(connection, id),
    getAccountsByAuthDescriptorId: (
      id: BufferId,
      limit?: number,
      cursor?: OptionalPageCursor
    ) => _getByAuthDescriptorId(connection, id, limit, cursor),
    getAssetById: (id: BufferId) => _getAssetById(connection, id),
    getAssetBySymbol: (symbol: string) => _getAssetBySymbol(connection, symbol),
    getAssetsByName: (
      name: string,
      limit?: number,
      cursor?: OptionalPageCursor
    ) => _getAssetsByName(connection, name, limit, cursor),
    getAllAssets: (limit?: number, cursor: OptionalPageCursor = null) =>
      getAllAssets(connection, limit, cursor),
  });

  return connection;
}

export function createSession(
  connection: Connection,
  authenticator: Authenticator
): Session {
  return Object.freeze({
    account: createAuthenticatedAccount(connection, authenticator),
    transactionBuilder: () =>
      transactionBuilder(authenticator, connection.client),
    call: (...operations: Operation[]) =>
      call(connection, authenticator, ...operations, nop()),
    callWithoutNop: (...operations: Operation[]) =>
      call(connection, authenticator, ...operations),
    ...connection,
  });
}

async function query<T extends RawGtv>(
  connection: Connection,
  queryObject: QueryObject<QueryArguments>
): Promise<T | null> {
  return await connection.client.query<QueryArguments, T>(queryObject);
}

export async function call(
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
  getAccounts(): Promise<IAccount[]>;
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
  keyStore: KeyStore
): KeyStoreInteractor {
  const connection = createConnection(client);
  return Object.freeze({
    getAccounts: async () => connection.getAccountsByParticipantId(keyStore.id),
    getSession: async (accountId: Buffer) => {
      const account = createAccountObject(connection, accountId);
      const authDescriptors = await account.getAuthDescriptorsByParticipantId(
        keyStore.id
      );
      const keyHandlers = authDescriptors.map((authDescriptor) =>
        keyStore.createKeyHandler(authDescriptor)
      );
      const authenticator = createAuthenticator(
        accountId,
        keyHandlers,
        createAuthDataService(connection)
      );

      return createSession(connection, authenticator);
    },
    getLoginManager: (loginKeyStore?: LoginKeyStore) =>
      createLoginManager(connection, keyStore, loginKeyStore),
  });
}
