import {
  TransactionWithReceipt,
  TransactionBuilderConfig,
  signTransaction,
  transactionBuilder,
} from "@ft4/transaction-builder";
import { Buffer } from "buffer";
import {
  DictPair,
  GTX,
  IClient,
  Operation,
  QueryCallback,
  QueryObject,
  RawGtv,
  RawGtx,
  SignedTransaction,
  TransactionReceipt,
  createClient,
  formatter,
  Web3PromiEvent,
} from "postchain-client";
import {
  BufferId,
  authHandlerForOperation,
  fetchExposedOperations,
  firstAllowedAuthDescriptor,
  getAllAuthHandlers,
  getConfig,
  getVersion,
  nop,
} from "@ft4/utils";
import {
  createAccountObject,
  createAuthDescriptorValidator,
  createAuthenticatedAccount,
  getByAuthDescriptorId,
  getById,
  getByType,
  getBySigner,
  getTransferDetails,
  getTransferDetailsByAsset,
} from "@ft4/accounts";
import {
  getAllAssets,
  getAssetById,
  getAssetsBySymbol,
  getAssetsByName,
  getAssetsByType,
  getAssetsFiltered,
  getBalancesFiltered,
  getTransferHistoryEntriesFiltered,
  getCrosschainTransferHistoryEntriesFiltered,
} from "@ft4/asset";
import {
  AuthDataService,
  AuthHandler,
  Authenticator,
  KeyStore,
  LoginOptions,
  authMessageTemplate,
  createAuthenticator,
  getLoginConfig,
  login,
  authDescriptorCounter,
} from "@ft4/authentication";
import { ftEventEmitter } from "@ft4/events";
import {
  Connection,
  KeyStoreInteractor,
  OptionalPageCursor,
  Session,
} from "./types";
import { getEnabledRegistrationStrategies } from "@ft4/registration";
import {
  getAcceptableAuthDescriptors,
  getConfigFromOptions,
} from "@ft4/authentication/login";
import { getApiVersion } from "@ft4/utils/main";
import {
  AssetFilter,
  BalanceFilter,
  CrosschainTransferHistoryEntryFilter,
  TransferHistoryEntryFilter,
} from "@ft4/asset/types";

/**
 * Uses the provided connection to create a new connection to the specified blockchain rid.
 * The new brid must be available in the cluster that the old connection is configured to use.
 * @param oldConnection - a connection that can be used to fetch the new blockchain info
 * @param newBlockchainRid - the rid of the blockchain to create connection for
 * @returns Connection instance configured to use the specified blockchain
 */
export async function createConnectionToBlockchainRid(
  oldConnection: Connection,
  newBlockchainRid: BufferId,
): Promise<Connection> {
  return createConnection(
    await createClientToBlockchain(oldConnection.client, newBlockchainRid),
  );
}

/**
 * Uses the provided client to instantiate a new client which targets a
 * different blockchain. Namely, the blockchain with the provided rid
 * @param client - the original client
 * @param blockchainRid - rid of the blockchain which the new client will target
 */
export async function createClientToBlockchain(
  client: IClient,
  blockchainRid: BufferId,
): Promise<IClient> {
  return await createClient({
    // assume same D1. Cross-chain doesn't work otherwise
    directoryNodeUrlPool: client.config.endpointPool.map((ep) => ep.url),
    blockchainRid:
      typeof blockchainRid == "string"
        ? blockchainRid
        : formatter.toString(blockchainRid),
  });
}

/**
 * Uses the specified client to create a Connection instance.
 * @param client - the client to use for the connection
 */
export function createConnection(client: IClient): Connection {
  const connection: Connection = Object.freeze({
    client,
    blockchainRid: Buffer.from(client.config.blockchainRid, "hex"),
    query: <TReturn extends RawGtv, TArgs extends DictPair | undefined>(
      nameOrQueryObject: string | QueryObject<TReturn, TArgs>,
      args?: TArgs,
      callback?: QueryCallback<TReturn>,
    ) => client.query<TReturn, TArgs>(nameOrQueryObject, args, callback),
    getConfig: () => getConfig(client),
    getVersion: () => getVersion(client),
    getApiVersion: () => getApiVersion(client),

    getBlockHeight: async () => {
      const [block] = await client.getBlocksInfo(1);
      return block.height;
    },

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
    getAccountsByType: (
      type: string,
      limit?: number,
      cursor: OptionalPageCursor = null,
    ) => getByType(connection, type, limit, cursor),
    getAuthDescriptorValidator: (useCache: boolean) =>
      createAuthDescriptorValidator(
        createAuthDataService(connection),
        useCache,
      ),
    getEnabledRegistrationStrategies: () =>
      getEnabledRegistrationStrategies(connection),

    getAssetById: (id: BufferId) => getAssetById(connection, id),
    getAssetsBySymbol: (
      symbol: string,
      limit?: number,
      cursor?: OptionalPageCursor,
    ) => getAssetsBySymbol(connection, symbol, limit, cursor),
    getAssetsByName: (
      name: string,
      limit?: number,
      cursor?: OptionalPageCursor,
    ) => getAssetsByName(connection, name, limit, cursor),
    getAssetsByType: (
      type: string,
      limit?: number,
      cursor: OptionalPageCursor = null,
    ) => getAssetsByType(connection, type, limit, cursor),
    getAllAssets: (limit?: number, cursor: OptionalPageCursor = null) =>
      getAllAssets(connection, limit, cursor),
    getAssetsFiltered: (
      assetFilter?: AssetFilter,
      limit?: number,
      cursor: OptionalPageCursor = null,
    ) => getAssetsFiltered(connection, assetFilter, limit, cursor),
    getBalancesFiltered: (
      balanceFilter?: BalanceFilter,
      limit?: number,
      cursor: OptionalPageCursor = null,
    ) => getBalancesFiltered(connection, balanceFilter, limit, cursor),
    getTransferHistoryEntriesFiltered: (
      transferHistoryEntryFilter?: TransferHistoryEntryFilter,
      limit?: number,
      cursor: OptionalPageCursor = null,
    ) =>
      getTransferHistoryEntriesFiltered(
        connection,
        transferHistoryEntryFilter,
        limit,
        cursor,
      ),
    getCrosschainTransferHistoryEntriesFiltered: (
      crosschainTransferHistoryEntryFilter?: CrosschainTransferHistoryEntryFilter,
      limit?: number,
      cursor: OptionalPageCursor = null,
    ) =>
      getCrosschainTransferHistoryEntriesFiltered(
        connection,
        crosschainTransferHistoryEntryFilter,
        limit,
        cursor,
      ),
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

/**
 * Uses the provided inputs to create a Session instance.
 * @param connection - connection to use for this session
 * @param authenticator - authenticator to use for this session
 */
export function createSession(
  connection: Connection,
  authenticator: Authenticator,
): Session {
  return Object.freeze({
    account: createAuthenticatedAccount(connection, authenticator),
    transactionBuilder: (
      config: TransactionBuilderConfig | undefined = undefined,
    ) => transactionBuilder(authenticator, connection.client, config),
    call: (...operations: Operation[]) =>
      call(connection, authenticator, ...operations),
    callWithoutNop: (...operations: Operation[]) =>
      callWithoutNop(connection, authenticator, ...operations),
    sign: (tx: GTX | RawGtx | SignedTransaction) =>
      signTransaction(authenticator, tx),
    signAndSend: (tx: GTX | RawGtx | SignedTransaction) =>
      signAndSendTransaction(connection, authenticator, tx),
    ...connection,
  });
}

/**
 * Builds and submits a transaction containing the specified operations
 * in the specified order. Furthermore, this function will use the provided
 * authenticator to correctly authenticate each operation in the transaction as
 * necessary. It will also insert a nop operation at the end of the transaction.
 * To prevent this behavior, see the function {@link callWithoutNop}.
 * @param connection - connection to the blockchain which the transaction will be submitted
 * @param authenticator - authenticator to use when authenticating the operations in the transaction
 * @param operations - the operations to include in the transaction
 * @returns promi-event which will emit once when transaction is built and once when it is sent. It will resolve to a transaction receipt.
 */
export function call(
  connection: Connection,
  authenticator: Authenticator,
  ...operations: Operation[]
): Web3PromiEvent<
  TransactionWithReceipt,
  {
    built: SignedTransaction;
    sent: Buffer;
  }
> {
  return callWithoutNop(connection, authenticator, ...operations, nop());
}

/**
 * Same as {@link call} but does not insert a nop at the end of the transaction.
 * This means that subsequent calls to this operation with the same input might fail due to
 * a transaction with the same rid already being in the tx history.
 * @param connection - connection to the blockchain which the transaction will be submitted
 * @param authenticator - authenticator to use when authenticating the operations in the transaction
 * @param operations - the operations to include in the transaction
 * @returns promi-event which will emit once when transaction is built and once when it is sent. It will resolve to a transaction receipt.
 */
export function callWithoutNop(
  connection: Connection,
  authenticator: Authenticator,
  ...operations: Operation[]
): Web3PromiEvent<
  TransactionWithReceipt,
  {
    built: SignedTransaction;
    sent: Buffer;
  }
> {
  const tb = transactionBuilder(authenticator, connection.client);
  operations.forEach((operation: Operation) => tb.add(operation));
  return tb.buildAndSend();
}

export async function signAndSendTransaction(
  connection: Connection,
  authenticator: Authenticator,
  tx: GTX | RawGtx | SignedTransaction,
): Promise<TransactionReceipt> {
  const signedTx = await signTransaction(authenticator, tx);
  return connection.client.sendTransaction(signedTx);
}

/**
 * Creates an instance of `AuthDataService` object.
 * @param connection - connection that the auth data service will use when interacting with the blockchain
 */
export function createAuthDataService(connection: Connection): AuthDataService {
  let exposedOperations: Set<string> | null = null;
  let authHandlers: { [key: string]: AuthHandler } | null = null;

  return Object.freeze({
    connection,
    isOperationExposed: async (operationName: string): Promise<boolean> => {
      if (!exposedOperations) {
        exposedOperations = await fetchExposedOperations(connection);
      }
      return exposedOperations.has(operationName);
    },
    getAuthHandlerForOperation: async (
      operationName: string,
    ): Promise<AuthHandler | null> => {
      if (!authHandlers) {
        authHandlers = (await getAllAuthHandlers(connection)) || {};
      }

      const authHandler: AuthHandler | null =
        authHandlers[operationName] ||
        authHandlers[`__override__${operationName}`];

      if (authHandler) return authHandler;

      const downloadedAuthHandler = await connection.query(
        authHandlerForOperation(operationName),
      );
      if (!downloadedAuthHandler) return null;

      authHandlers[operationName] = downloadedAuthHandler;
      return downloadedAuthHandler;
    },
    getAllowedAuthDescriptor: async (
      operation: Operation,
      accountId: BufferId,
      adIds: BufferId[],
    ) => {
      return connection.query(
        firstAllowedAuthDescriptor(
          operation.name,
          operation.args ?? {},
          accountId,
          adIds,
        ),
      );
    },
    getAuthMessageTemplate: async (operation: Operation) => {
      return await connection.query(authMessageTemplate(operation));
    },
    getAuthDescriptorCounter: async (
      accountId: BufferId,
      authDescriptorId: BufferId,
    ) => connection.query(authDescriptorCounter(accountId, authDescriptorId)),
    getLoginConfig: (configName?: string) =>
      getLoginConfig(connection, configName),
    getBlockchainRid: () =>
      Buffer.from(connection.client.config.blockchainRid, "hex"),
  });
}

/**
 * Creates a `KeyStoreInteractor` instance.
 * @param client - client that will be used to communicate with the blockchain
 * @param keyStore - the keystore which this interactor will interact with
 */
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
    login: (loginOptions: LoginOptions) =>
      login(connection, keyStore, loginOptions),
    hasActiveLogin: async (loginOptions: LoginOptions) => {
      // if no keystore was passed, no keys are available
      if (loginOptions.loginKeyStore === undefined) return false;

      const ks = await loginOptions.loginKeyStore.getKeyStore(
        formatter.ensureBuffer(loginOptions.accountId),
      );

      // if no keystore for this account was found, no keys are available
      if (ks === null) return false;

      // Get list of flags that will be added to new auth descriptor
      const authDataService = createAuthDataService(connection);
      const config = await getConfigFromOptions(authDataService, loginOptions);

      const account = createAccountObject(connection, loginOptions.accountId);

      const ads = await getAcceptableAuthDescriptors(account, ks, config.flags);

      return ads.length > 0;
    },
    onKeyStoreChanged: async (
      handler: (arg0: KeyStoreInteractor | null) => void,
    ) => {
      ftEventEmitter.on("KeyStoreChange", (newKeyStore: KeyStore | null) => {
        if (!newKeyStore) {
          handler(null);
          return;
        }
        handler(createKeyStoreInteractor(client, newKeyStore));
      });
    },
  });
}
