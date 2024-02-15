import { Buffer } from "buffer";
import { hasAuthDescriptorFlags } from "../ft/key-handler";
import {
  createAuthenticator,
  AuthDataService,
  KeyHandler,
  KeyStore,
} from "@ft4/authentication";
import { createInMemoryLoginKeyStore } from "./stores/in-memory";
import { LoginKeyStore } from "./stores/types";
import { LoginManager, LoginOptions, LoginConfigOptions } from "./types";
import { authDescriptorById } from "@ft4/accounts/account-queries";
import { createAccountObject } from "@ft4/accounts/account-query-functions";
import {
  AuthDescriptorRules,
  FlagsType,
  createSingleSigAuthDescriptorRegistration,
  deriveAuthDescriptorId,
  gtv,
} from "@ft4/accounts/auth-descriptor";
import { Connection, createSession } from "@ft4/index";
import { createAuthDataService } from "@ft4/ft-session";
import { mapLoginConfigRulesToAuthDescriptorRules } from "./rules";

export * from "./types";
export * from "./queries";
export * from "./query-functions";
export { LoginKeyStore };

export function createLoginManager(
  connection: Connection,
  keyStore: KeyStore,
  loginKeyStore: LoginKeyStore | null = null,
): LoginManager {
  const usedLoginKeyStore = loginKeyStore || createInMemoryLoginKeyStore();

  return Object.freeze({
    login: async (loginOptions: LoginOptions) => {
      const account = createAccountObject(connection, loginOptions.accountId);

      // Get all auth descriptors that can be used with the provided key store
      const authDescriptors = await account.getAuthDescriptorsBySigner(
        keyStore.id,
      );

      // We need need an auth descriptor with admin flag in order to add a
      // disposable key
      const adminAuthDescriptor = authDescriptors.find((authDescriptor) =>
        authDescriptor.args.flags.includes(FlagsType.Account),
      );

      if (!adminAuthDescriptor) {
        throw new Error(
          `Admin auth descriptor does not exist for provided key store <${keyStore.id.toString(
            "hex",
          )}>`,
        );
      }

      let disposableKeyHandlers: KeyHandler[] = [];

      const authDataService = createAuthDataService(connection);
      // Get list of flags that will be added to new auth descriptor
      const config = await getConfigFromOptions(authDataService, loginOptions);

      const loginKeyStore = await usedLoginKeyStore.getKeyStore(account.id);

      // If disposable key pair exists in login key store for provided account id,
      // check if there are already auth descriptors with required flags.
      // If they already exist then it will be used instead of adding a new auth descriptor
      if (loginKeyStore) {
        const disposableAuthDescriptors =
          await account.getAuthDescriptorsBySigner(loginKeyStore.id);
        disposableKeyHandlers = disposableAuthDescriptors
          // TODO: filter out expired auth descriptors
          .filter((authDescriptor) =>
            // If
            hasAuthDescriptorFlags(authDescriptor, config.flags),
          )
          .map((authDescriptor) =>
            loginKeyStore.createKeyHandler(authDescriptor),
          );
      }

      // Key pair was not found in login key store,
      // or there are no auth descriptors that have required flags.
      // Add new auth descriptor.
      if (!disposableKeyHandlers.length) {
        const disposableKeyHandler = await addDisposableAuthDescriptor(
          connection,
          usedLoginKeyStore,
          account.id,
          keyStore.createKeyHandler(adminAuthDescriptor),
          config.flags,
          config.rules,
        );
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

      return createSession(connection, authenticator);
    },
    logout: (accountId: Buffer) => {
      usedLoginKeyStore.clear(accountId);
    },
  });
}

/*
 * Returns auth flags and rules provided as option to login manager's `login` function,
 * or if they are not provided, the function uses config name to load login config from chain.
 * If configName is null or undefined too, then default login config will be loaded from chain.
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
): Promise<KeyHandler> {
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

  return ks.createKeyHandler(ad);
}
