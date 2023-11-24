import { createAuthenticator } from "..";
import { createInMemoryFtKeyStore } from "../ft/key-stores/in-memory";
import { AuthDataService, KeyHandler, KeyStore } from "../types";
import { createInMemoryLoginKeyStore } from "./stores/in-memory";
import { LoginKeyStore } from "./stores/types";
import { LoginManager, LoginOptions } from "./types";
import { createAccountObject } from "../../accounts/account-query-functions";
import {
  AuthDescriptorRule,
  FlagsType,
  authDescriptor,
} from "../../accounts/auth-descriptor";
import { createAuthDataService, createSession } from "../../ft-session";
import { Connection } from "../../types";
import { hasAuthDescriptorFlags } from "../ft/key-handler";
import { allow } from "/ft4/accounts/auth-descriptor/rules";

export * from "./types";

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
      const authDescriptors = await account.getAuthDescriptorsByParticipantId(
        keyStore.id,
      );

      // We need need an auth descriptor with admin flag in order to add a
      // disposable key
      const adminAuthDescriptor = authDescriptors.find((authDescriptor) =>
        authDescriptor.flags.has(FlagsType.Account),
      );

      if (!adminAuthDescriptor) {
        throw new Error(
          `Admin auth descriptor does not exist for provided key store <${keyStore.id.toString(
            "hex",
          )}>`,
        );
      }

      let disposableKeyHandlers = [];

      const authDataService = createAuthDataService(connection);
      // Get list of flags that will be added to new auth descriptor
      const config = await getFlagsAndRules(authDataService, loginOptions);

      const keyPair = await usedLoginKeyStore.getKeyPair(account.id);

      // If disposable key pair exists in login key store for provided account id,
      // check if there are already auth descriptors with required flags.
      // If they already exist then it will be used instead of adding a new auth descriptor
      if (keyPair) {
        const disposableKeyStore = createInMemoryFtKeyStore(keyPair);
        const disposableAuthDescriptors =
          await account.getAuthDescriptorsByParticipantId(keyPair.pubKey);
        disposableKeyHandlers = disposableAuthDescriptors
          // TODO: filter out expired auth descriptors
          .filter((authDescriptor) =>
            // If
            hasAuthDescriptorFlags(authDescriptor, config.flags),
          )
          .map((authDescriptor) =>
            disposableKeyStore.createKeyHandler(authDescriptor),
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
async function getFlagsAndRules(
  authDataService: AuthDataService,
  options: LoginOptions,
): Promise<{ flags: string[]; rules: AuthDescriptorRule }> {
  let flags: string[];
  let rules: AuthDescriptorRule;
  if (options.config) {
    flags = options.config.flags;
    rules = options.config.ttl
      ? // if we have ttl, use it
        allow.blockTime.lessThan(Date.now() + options.config.ttl).only
      : // if we have rules, use them. Otherwise, allow all (no rules)
        options.config.rules ?? allow.all;
  } else {
    const loginConfig = await authDataService.getLoginConfig(
      options.configName,
    );
    flags = loginConfig.flags;
    rules = loginConfig.ttl
      ? allow.blockTime.lessThan(Date.now() + loginConfig.ttl).only
      : allow.all;
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
  rules: AuthDescriptorRule,
): Promise<KeyHandler> {
  const authenticator = createAuthenticator(
    accountId,
    [adminAuthHandler],
    createAuthDataService(connection),
  );

  const session = createSession(connection, authenticator);

  const keyPair = await loginKeyStore.createKeyPair(accountId);
  const ks = createInMemoryFtKeyStore(keyPair);

  const ad = authDescriptor.create.singleSig
    .withArgs(flags, keyPair.pubKey)
    .andRules(rules);

  await session.account.addAuthDescriptor(ad, keyPair);

  return ks.createKeyHandler(ad);
}

/*
 * Allows the user to specify a ttl value like this:
 * weeks(1)+days(3)
 * None of these functions care in any way about leap seconds and any other time adjustments
 * This means that when you define an auth descriptor with a rule that makes it expire after
 * 1 day, it will expire after exactly 24h, even if there has been a leap second during that
 * day, which means it will be off by a second (e.g. starts at 14:00:00 and expires the next
 * day at 13:59:59).
 */
export const minutes = (m: number) => m * 60000;
export const hours = (h: number) => h * 3600000;
export const days = (d: number) => d * 86400000;
export const weeks = (w: number) => w * 604800000;
