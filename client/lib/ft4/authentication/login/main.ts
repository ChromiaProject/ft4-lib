import {
  Account,
  AnyAuthDescriptor,
  AuthDescriptorRules,
  AuthenticatedAccount,
  authDescriptorById,
  createAccountObject,
  createAuthenticatedAccount,
  createSingleSigAuthDescriptorRegistration,
  deleteAuthDescriptorsForSigner,
  deriveAuthDescriptorId,
  gtv,
} from "@ft4/accounts";
import {
  AuthDataService,
  FtKeyStore,
  KeyHandler,
  KeyStore,
  createAuthenticator,
  hasAuthDescriptorFlags,
} from "@ft4/authentication";
import {
  Connection,
  call,
  createAuthDataService,
  createSession,
} from "@ft4/ft-session";
import { Buffer } from "buffer";
import { mapLoginConfigRulesToAuthDescriptorRules } from "./rules";
import { LoginKeyStore, createInMemoryLoginKeyStore } from "./stores";
import {
  LoginConfigOptions,
  LoginError,
  LoginOptions,
  SessionWithLogout,
} from "./types";
import { isAuthDescriptorValid } from "@ft4/accounts/query-functions";
import { BufferId, formatter, Web3PromiEvent } from "postchain-client";

/**
 * Uses the provided keystore to log into the specified account. It will recover
 * a previous login session if it exists, or create a new one otherwise.
 * @param connection - to interact with the blockchain that hosts the account
 * @param keyStore - keystore used to sign into the account. Must be tied to an auth descriptor associated with the account
 * @param loginOptions - what account to sign into and other options
 * @param filterAuthDescriptors - function to filter the auth descriptors that can be used to login.
 * This could be used to filter out auth descriptors that are too close to expiration. Return false
 * to reject an auth descriptor, true otherwise.
 * @returns the authorized session
 */
export function login(
  connection: Connection,
  loginOptions: LoginOptions,
  keyStore?: KeyStore,
  filterAuthDescriptors: (authDescriptors: AnyAuthDescriptor) => boolean = () =>
    true,
): Web3PromiEvent<
  SessionWithLogout,
  {
    hasActiveLogin: boolean;
    waitingForSignature: undefined;
  }
> {
  const promiEvent = new Web3PromiEvent<
    SessionWithLogout,
    {
      hasActiveLogin: boolean;
      waitingForSignature: undefined;
    }
  >(async (resolve, reject) => {
    const loginKeyStore =
      loginOptions.loginKeyStore || createInMemoryLoginKeyStore();
    const { account, authDataService } = await getAccountAndAuthDataService(
      connection,
      loginOptions.accountId,
    );

    const { disposableKeyHandlers, masterKeyHandlers, config } =
      await getKeyHandlers(
        account,
        authDataService,
        { ...loginOptions, loginKeyStore },
        keyStore,
      );

    const acceptableKeyHandlers = disposableKeyHandlers.filter((kh) =>
      filterAuthDescriptors(kh.authDescriptor),
    );
    const hasLogin = acceptableKeyHandlers.length > 0;

    promiEvent.emit("hasActiveLogin", hasLogin);

    if (hasLogin) {
      const authenticator = createAuthenticator(
        loginOptions.accountId,
        [...disposableKeyHandlers, ...masterKeyHandlers],
        authDataService,
      );

      const session = createSession(connection, authenticator);
      return resolve(
        Object.freeze({
          session,
          logout: async () => {
            await deleteDisposableAuthDescriptors(
              connection,
              session.account,
              disposableKeyHandlers[0].keyStore as FtKeyStore,
            );
            await loginKeyStore.clear(session.account.id);
          },
        }),
      );
    }

    if (!keyStore || !masterKeyHandlers.length) {
      reject(
        new LoginError(
          "No active login was found, and no admin keystore is available to create a new one.",
        ),
      );
    }

    promiEvent.emit("waitingForSignature", undefined);

    const { disposableKeyHandler } = await addDisposableAuthDescriptor(
      account.connection,
      loginKeyStore,
      account.id,
      masterKeyHandlers,
      config.flags,
      config.rules,
    );

    const authenticator = createAuthenticator(
      loginOptions.accountId,
      [disposableKeyHandler, ...masterKeyHandlers],
      authDataService,
    );

    const session = createSession(account.connection, authenticator);
    return resolve(
      Object.freeze({
        session,
        logout: async () => {
          await deleteDisposableAuthDescriptors(
            account.connection,
            session.account,
            disposableKeyHandler.keyStore as FtKeyStore,
          );
          await loginKeyStore.clear(session.account.id);
        },
      }),
    );
  });

  return promiEvent;
}

/**
 * Recovers a login session from a previous login which is still stored in the login key store.
 * This only happens if `logout` is not called after the previous login. You can
 * verify whether this function will succeed by calling `getActiveLoginAuthDescriptors` before
 * calling this function.
 *
 * @param connection - the connection to the blockchain the account is on
 * @param loginOptions - the login options, including the ID of the account to sign into
 * @param keyStore - optional, the key store to use in the session when any operation
 * cannot be authenticated by the disposable auth descriptor.
 * @returns the authenticated session and a logout function to use to sign out
 */
export async function recoverLogin(
  connection: Connection,
  loginOptions: LoginOptions & { loginKeyStore: LoginKeyStore },
  keyStore?: KeyStore,
) {
  const { account, authDataService } = await getAccountAndAuthDataService(
    connection,
    loginOptions.accountId,
  );
  const { disposableKeyHandlers, masterKeyHandlers } = await getKeyHandlers(
    account,
    authDataService,
    loginOptions,
    keyStore,
  );

  // There are no auth descriptors that have required flags.
  if (!disposableKeyHandlers.length)
    throw new LoginError(
      "There are no auth descriptors that have the required flags associated" +
        "with this login key store",
    );

  const authenticator = createAuthenticator(
    loginOptions.accountId,
    [...disposableKeyHandlers, ...masterKeyHandlers],
    authDataService,
  );

  const session = createSession(connection, authenticator);
  return Object.freeze({
    session,
    logout: async () => {
      await deleteDisposableAuthDescriptors(
        connection,
        session.account,
        disposableKeyHandlers[0].keyStore as FtKeyStore,
      );
      await loginOptions.loginKeyStore.clear(session.account.id);
    },
  });
}

/**
 * Creates a new login session, deleting the previous login session from the login key store
 * along with any disposable auth descriptors associated with that old session. This
 * effectively cleans up if `logout` is not called after the previous login.
 *
 * @param connection - the connection to the blockchain the account is on
 * @param loginOptions - the login options, including the ID of the account to sign into
 * @param keyStore - the key store to use to register the disposable auth descriptor,
 * and in the session when any operation cannot be authenticated by the disposable
 * auth descriptor.
 * @returns the authenticated session and a logout function to use to sign out
 */
export async function newLogin(
  connection: Connection,
  loginOptions: LoginOptions,
  keyStore: KeyStore,
) {
  const { account, authDataService } = await getAccountAndAuthDataService(
    connection,
    loginOptions.accountId,
  );
  const loginKeyStore =
    loginOptions.loginKeyStore || createInMemoryLoginKeyStore();
  const accountId = formatter.ensureBuffer(loginOptions.accountId);

  await _cleanupOldLoginSession(account, authDataService, loginKeyStore);

  const { masterKeyHandlers, config } = await getKeyHandlers(
    account,
    authDataService,
    loginOptions,
    keyStore,
  );

  const { disposableKeyHandler } = await addDisposableAuthDescriptor(
    account.connection,
    loginKeyStore,
    accountId,
    masterKeyHandlers,
    config.flags,
    config.rules,
  );

  const authenticator = createAuthenticator(
    loginOptions.accountId,
    [disposableKeyHandler, ...masterKeyHandlers],
    authDataService,
  );

  const session = createSession(account.connection, authenticator);
  return Object.freeze({
    session,
    logout: async () => {
      await deleteDisposableAuthDescriptors(
        account.connection,
        session.account,
        disposableKeyHandler.keyStore as FtKeyStore,
      );
      await loginKeyStore.clear(session.account.id);
    },
  });
}

/**
 * Returns auth flags and rules provided as option to the `login` function,
 * or if they are not provided, the function uses config name to load login config from chain.
 * If configName is null or undefined too, then default login config will be loaded from chain.
 * @param authDataService - the auth data service to use
 * @param options - the options to use
 */
export async function getConfigFromOptions(
  authDataService: AuthDataService,
  options: LoginConfigOptions,
): Promise<{ flags: string[]; rules: AuthDescriptorRules | null }> {
  let flags: string[];
  let rules: AuthDescriptorRules | null;

  let currentHeight: number;
  const getBlockHeight = async () => {
    if (currentHeight === undefined) {
      currentHeight = await authDataService.connection.getBlockHeight();
    }
    return currentHeight;
  };

  if (options.config) {
    flags = options.config.flags;
    rules =
      options.config.rules &&
      (await mapLoginConfigRulesToAuthDescriptorRules(
        options.config.rules,
        getBlockHeight,
      ));
  } else {
    const loginConfig = await authDataService.getLoginConfig(
      options.configName,
    );
    flags = loginConfig.flags;
    rules =
      loginConfig.rules &&
      (await mapLoginConfigRulesToAuthDescriptorRules(
        loginConfig.rules,
        getBlockHeight,
      ));
  }
  return {
    flags,
    rules,
  };
}

async function addDisposableAuthDescriptor(
  connection: Connection,
  loginKeyStore: LoginKeyStore,
  accountId: Buffer,
  adminAuthHandler: KeyHandler[],
  flags: string[],
  rules: AuthDescriptorRules | null,
): Promise<{
  disposableKeyStore: FtKeyStore;
  disposableKeyHandler: KeyHandler;
}> {
  const authenticator = createAuthenticator(
    accountId,
    adminAuthHandler,
    createAuthDataService(connection),
  );

  const session = createSession(connection, authenticator);

  const ks = await loginKeyStore.generateKey(accountId);

  const registration = createSingleSigAuthDescriptorRegistration(
    flags,
    ks.id,
    rules,
  );

  await session.account.addAuthDescriptor(registration, ks);
  const ad = gtv.authDescriptorFromGtv(
    await connection.query(
      authDescriptorById(
        accountId,
        deriveAuthDescriptorId(registration, connection),
      ),
    ),
  );

  return {
    disposableKeyStore: ks,
    disposableKeyHandler: ks.createKeyHandler(ad),
  };
}

/**
 * Deletes all disposable auth descriptors of an account. Useful in many
 * cases but perhaps especially so when the user has reached its maximum
 * number of auth descriptors added to an account and no longer has access
 * to the key to anyone of them. Such as when the disposable had a long
 * timeout and the keys were only stored in memory.
 * @param connection - the connection to use when calling the blockchain
 * @param account - the account which to delete the auth descriptors from
 * @param key - the key to the auth descriptor that will be used to delete
 * the auth descriptors, probably the key to the main auth descriptor.
 */
export async function deleteDisposableAuthDescriptors(
  connection: Connection,
  account: AuthenticatedAccount,
  key: FtKeyStore,
) {
  await call(
    connection,
    account.authenticator,
    deleteAuthDescriptorsForSigner(key.pubKey),
  );
}

/**
 * Cleans up the old login session by deleting all disposable auth descriptors
 * associated with the account.
 * @param account - the account to clean up
 * @param authDataService - the auth data service to use
 * @param loginKeyStore - the login key store to use
 */
async function _cleanupOldLoginSession(
  account: Account,
  authDataService: AuthDataService,
  loginKeyStore: LoginKeyStore,
) {
  const ks = await loginKeyStore.getKeyStore(account.id);

  if (!ks) return;

  const allAuthDescriptors = await account.getAuthDescriptorsBySigner(ks.id);

  if (allAuthDescriptors.length) {
    const allKeyHandlers = allAuthDescriptors.map((ad) =>
      ks.createKeyHandler(ad),
    );
    const authenticator = createAuthenticator(
      account.id,
      allKeyHandlers,
      authDataService,
    );

    const authAccount = createAuthenticatedAccount(
      account.connection,
      authenticator,
    );

    await deleteDisposableAuthDescriptors(account.connection, authAccount, ks);
  }

  await loginKeyStore.clear(account.id);
}

/**
 * Cleans up the old login session by deleting all disposable auth descriptors
 * associated with the account.
 * @param account - the account to clean up
 * @param authDataService - the auth data service to use
 * @param loginKeyStore - the login key store to use
 */
export async function cleanupOldLoginSession(
  accountId: BufferId,
  connection: Connection,
  loginKeyStore: LoginKeyStore,
) {
  const { account, authDataService } = await getAccountAndAuthDataService(
    connection,
    accountId,
  );
  const ks = await loginKeyStore.getKeyStore(account.id);

  if (!ks) return;

  const allAuthDescriptors = await account.getAuthDescriptorsBySigner(ks.id);

  if (allAuthDescriptors.length) {
    const allKeyHandlers = allAuthDescriptors.map((ad) =>
      ks.createKeyHandler(ad),
    );
    const authenticator = createAuthenticator(
      account.id,
      allKeyHandlers,
      authDataService,
    );

    const authAccount = createAuthenticatedAccount(
      account.connection,
      authenticator,
    );

    await deleteDisposableAuthDescriptors(account.connection, authAccount, ks);
  }

  await loginKeyStore.clear(account.id);
}

export async function getAcceptableAuthDescriptors(
  account: Account,
  loginKeyStore: FtKeyStore,
  flags: string[],
) {
  const allAuthDescriptors = await account.getAuthDescriptorsBySigner(
    loginKeyStore.id,
  );

  const isValid = await Promise.all(
    allAuthDescriptors.map(async (authDescriptor) => {
      return (
        hasAuthDescriptorFlags(authDescriptor, flags) &&
        (await isAuthDescriptorValid(
          account.connection,
          account.id,
          authDescriptor.id,
        ))
      );
    }),
  );

  return allAuthDescriptors.filter((_ad, idx) => isValid[idx]);
}

/**
 * Checks if there is an active session storage login for the provided account with the provided flags.
 * It will return all auth descriptors that can be used to login, so that the rules can be checked to
 * filter out the ones that are too close to expiration.
 *
 * @param account - the account to check
 * @param requiredFlags - the flags to check for. If not provided, any auth descriptor will be considered valid.
 * @returns the auth descriptors that can be used to login
 */
export async function getActiveLoginAuthDescriptors(
  account: Account,
  loginKeyStore: LoginKeyStore,
  requiredFlags: string[] = [],
): Promise<AnyAuthDescriptor[]> {
  const sessionKeyStore = await loginKeyStore.getKeyStore(account.id);

  const id = sessionKeyStore?.id;
  if (!id) return [];

  const disposableAds = await account.getAuthDescriptorsBySigner(id);
  const acceptableAds = disposableAds.filter((ad) =>
    hasAuthDescriptorFlags(ad, requiredFlags),
  );
  return acceptableAds;
}

async function getKeyHandlers(
  account: Account,
  authDataService: AuthDataService,
  loginOptions: LoginOptions,
  keyStore?: KeyStore,
): Promise<{
  disposableKeyHandlers: KeyHandler[];
  masterKeyHandlers: KeyHandler[];
  config: { flags: string[]; rules: AuthDescriptorRules | null };
}> {
  // Get all auth descriptors that can be used with the provided key store
  const authDescriptors = keyStore
    ? await account.getAuthDescriptorsBySigner(keyStore.id)
    : [];

  let disposableKeyHandlers: KeyHandler[] = [];

  // Get list of flags that will be added to new auth descriptor
  const config = await getConfigFromOptions(authDataService, loginOptions);

  const usedLoginKeyStore = loginOptions.loginKeyStore;
  const loginKeyStore = await usedLoginKeyStore?.getKeyStore(account.id);

  // If disposable key pair exists in login key store for provided account id,
  // check if there are already auth descriptors with required flags.
  // If they already exist then it will be used instead of adding a new auth descriptor
  if (loginKeyStore) {
    disposableKeyHandlers = (
      await getAcceptableAuthDescriptors(account, loginKeyStore, config.flags)
    ).map((ad) => loginKeyStore.createKeyHandler(ad));
  }

  // Initialize key handlers that correspond to master key store
  const masterKeyHandlers = authDescriptors.map((authDescriptor) =>
    // if authDescriptor is not empty, keyStore exists
    keyStore!.createKeyHandler(authDescriptor),
  );

  return {
    disposableKeyHandlers,
    masterKeyHandlers,
    config,
  };
}

async function getAccountAndAuthDataService(
  connection: Connection,
  accountId: BufferId,
) {
  const account = createAccountObject(connection, accountId);
  const authDataService = createAuthDataService(connection);
  return { account, authDataService };
}
