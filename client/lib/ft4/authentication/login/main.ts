import {
  Account,
  AuthDescriptorRules,
  AuthFlag,
  AuthenticatedAccount,
  authDescriptorById,
  createAccountObject,
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
import { LoginConfigOptions, LoginOptions, SessionWithLogout } from "./types";
import { isAuthDescriptorValid } from "@ft4/accounts/query-functions";

/**
 * Uses the provided keystore to log into the specified account
 * @param connection - to interact with the blockchain that hosts the account
 * @param keyStore - keystore used to sign into the account. Must be tied to an auth descriptor associated with the account
 * @param loginOptions - what account to sign into and other options
 * @returns the authorized session
 */
export async function login(
  connection: Connection,
  keyStore: KeyStore,
  loginOptions: LoginOptions,
): Promise<SessionWithLogout> {
  const account = createAccountObject(connection, loginOptions.accountId);

  // Get all auth descriptors that can be used with the provided key store
  const authDescriptors = await account.getAuthDescriptorsBySigner(keyStore.id);

  // We need an auth descriptor with admin flag in order to add a disposable key
  const adminAuthDescriptor = authDescriptors.find((authDescriptor) =>
    authDescriptor.args.flags.includes(AuthFlag.Account),
  );

  if (!adminAuthDescriptor) {
    throw new Error(
      `Admin auth descriptor does not exist for provided key store <${keyStore.id.toString(
        "hex",
      )}>`,
    );
  }

  let disposableKeyStore: FtKeyStore;
  let disposableKeyHandlers: KeyHandler[] = [];

  const authDataService = createAuthDataService(connection);
  // Get list of flags that will be added to new auth descriptor
  const config = await getConfigFromOptions(authDataService, loginOptions);

  const usedLoginKeyStore =
    loginOptions.loginKeyStore || createInMemoryLoginKeyStore();
  const loginKeyStore = await usedLoginKeyStore.getKeyStore(account.id);

  // If disposable key pair exists in login key store for provided account id,
  // check if there are already auth descriptors with required flags.
  // If they already exist then it will be used instead of adding a new auth descriptor
  if (loginKeyStore) {
    disposableKeyStore = loginKeyStore;
    disposableKeyHandlers = (
      await getAcceptableAuthDescriptors(account, loginKeyStore, config.flags)
    ).map((ad) => loginKeyStore.createKeyHandler(ad));
  }

  // Key pair was not found in login key store,
  // or there are no auth descriptors that have required flags.
  // Add new auth descriptor.
  if (!disposableKeyHandlers.length) {
    const { disposableKeyStore: _disposableKeyStore, disposableKeyHandler } =
      await addDisposableAuthDescriptor(
        connection,
        usedLoginKeyStore,
        account.id,
        keyStore.createKeyHandler(adminAuthDescriptor),
        config.flags,
        config.rules,
      );
    disposableKeyStore = _disposableKeyStore;
    disposableKeyHandlers = [disposableKeyHandler];
  }

  // Initialize key handlers that correspond to master key store
  const masterKeyHandlers = authDescriptors.map((authDescriptor) =>
    keyStore.createKeyHandler(authDescriptor),
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
        disposableKeyStore,
      );
      await usedLoginKeyStore.clear(session.account.id);
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
  adminAuthHandler: KeyHandler,
  flags: string[],
  rules: AuthDescriptorRules | null,
): Promise<{
  disposableKeyStore: FtKeyStore;
  disposableKeyHandler: KeyHandler;
}> {
  const authenticator = createAuthenticator(
    accountId,
    [adminAuthHandler],
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
      authDescriptorById(accountId, deriveAuthDescriptorId(registration)),
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
