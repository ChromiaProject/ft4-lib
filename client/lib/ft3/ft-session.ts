import { GtxClient } from "postchain-client/built/src/gtx/interfaces";
import { accountQuerySession, accountUserSession } from "./account";
import { IAccount, User } from "./account/types";
import { assetQuerySession, assetUserSession } from "./asset";
import {
  ftQuerySession,
  ftUserSession,
  Connection,
  Session,
  OptionalPageCursor,
} from "./types";
import { getConfig, getVersion, nop } from "./utils";
import { BufferId } from "../cryptoUtils";
import {
  _getByParticipantId,
  _getByAuthDescriptorId,
  _getById,
  createAccountObject,
} from "./account/account-query-functions";
import { Operation, QueryObject } from "./utils/types";
import {
  _getAllAssets,
  _getAssetById,
  _getAssetsByName,
  _getAllAssetsPaginated,
} from "./asset/asset-query-functions";
import { createAuthenticatedAccount } from "./account/account-op-functions";
import { transactionBuilder } from "./utils/transaction-builder";
import {
  AuthData,
  AuthDataService,
  Authenticator,
  KeyStore,
} from "./authentication/interfaces";
import {
  authDataQuery,
  createAuthenicator,
  defaultFTAuthData,
  nonce,
} from "./authentication";
import { Buffer } from "buffer";

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

export function createConnection(client: GtxClient): Connection {
  const connection = Object.freeze({
    client,
    query: <T>(queryObject: QueryObject) => query<T>(connection, queryObject),
    getConfig: () => getConfig(client),
    getVersion: () => getVersion(client),

    getAccountById: (id: BufferId) => _getById(connection, id),
    getAccountsByParticipantId: (id: BufferId) =>
      _getByParticipantId(connection, id),
    getAccountsByAuthDescriptorId: (id: BufferId) =>
      _getByAuthDescriptorId(connection, id),

    getAssetById: (id: BufferId) => _getAssetById(connection, id),
    getAssetsByName: (name: string) => _getAssetsByName(connection, name),
    getAllAssets: () => _getAllAssets(connection),
    getAllAssetsPaginated: (
      limit?: number,
      cursor: OptionalPageCursor = null
    ) => _getAllAssetsPaginated(connection, limit, cursor),
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

async function query<T>(
  connection: Connection,
  queryObject: QueryObject
): Promise<T | null> {
  return await connection.client.query(queryObject.name, queryObject.args);
}

export async function call(
  connection: Connection,
  authenticator: Authenticator,
  ...operations: Operation[]
): Promise<void> {
  const tb = transactionBuilder(authenticator, connection.client);
  operations.forEach((operation: Operation) => tb.add(operation));
  const tx = await tb.build();
  await tx.postAndWaitConfirmation();
  return;
}

export type KeyStoreInteractor = {
  getAccounts(): Promise<IAccount[]>;
  getSession(accountId: BufferId): Promise<Session>;
};

// TODO: Improve error handling
// Use `rell.get_app_structure` to get exposed queries (FT3-99)
export function createAuthDataService(connection: Connection): AuthDataService {
  return Object.freeze({
    getAuthData: async (operation: Operation) => {
      let authData: AuthData | null;
      try {
        authData = await connection.query<AuthData>(authDataQuery(operation));
      } catch {
        try {
          authData = await connection.query<AuthData>(defaultFTAuthData);
        } catch {
          authData = {
            flags: [],
            message: "",
          };
        }
      }
      return authData!;
    },
    getNonce: async (authDescriptorId: BufferId) =>
      connection.query<number>(nonce(authDescriptorId)),
  });
}

export function createKeyStoreInteractor(
  client: GtxClient,
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
      const authenticator = createAuthenicator(
        accountId,
        keyHandlers,
        createAuthDataService(connection)
      );

      return createSession(connection, authenticator);
    },
  });
}
