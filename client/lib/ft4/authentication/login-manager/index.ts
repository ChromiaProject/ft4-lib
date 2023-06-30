import { createAuthenticator } from "..";
import { createInMemoryFTKeyStore } from "../ft/key-stores/in-memory";
import { AuthDataService, KeyHandler, KeyStore } from "../types";
import { createInMemoryLoginKeyStore } from "./stores/in-memory";
import { LoginKeyStore } from "./stores/types";
import { LoginManger, LoginOptions } from "./types";
import { createAccountObject } from "/ft4/accounts/account-query-functions";
import { FlagsType, authDescriptor } from "/ft4/accounts/auth-descriptor";
import { createAuthDataService, createSession } from "/ft4/ft-session";
import { Connection } from "/ft4/types";
import { hasAuthDescriptorFlags } from "../ft/key-handler";

export * from "./types";

export function createLoginManager(
  connection: Connection,
  keyStore: KeyStore,
  loginKeyStore: LoginKeyStore | null = null
): LoginManger {
  const accountIdKeyStoreMap = new Map<Buffer, LoginKeyStore>();
  const usedLoginKeyStore = loginKeyStore || createInMemoryLoginKeyStore();

  return Object.freeze({
    login: async (options: LoginOptions) => {
      const account = createAccountObject(connection, options.accountId);

      const authDescriptors = await account.getAuthDescriptorsByParticipantId(
        keyStore.id
      );

      const adminAuthDescriptor = authDescriptors.find((authDescriptor) =>
        authDescriptor.flags.has(FlagsType.Account)
      );

      if (!adminAuthDescriptor) {
        throw new Error(
          `Admin auth descriptor does not exist for provided key store <${keyStore.id.toString(
            "hex"
          )}>`
        );
      }

      let disposableKeyHandlers = [];

      const authDataService = createAuthDataService(connection);
      const flags = await getFlags(authDataService, options);

      const keyPair = await usedLoginKeyStore.getKeyPair(account.id);

      if (keyPair) {
        const disposableKeyStore = createInMemoryFTKeyStore(keyPair);
        const disposableAuthDescriptors =
          await account.getAuthDescriptorsByParticipantId(keyPair.pubKey);
        disposableKeyHandlers = disposableAuthDescriptors
          // TODO: filter out expired auth descriptors
          .filter((authDescriptor) =>
            hasAuthDescriptorFlags(authDescriptor, flags)
          )
          .map((authDescriptor) =>
            disposableKeyStore.createKeyHandler(authDescriptor)
          );
      }

      // Key pair was not found in login key store, or there are no auth descriptors that have required flags
      if (!disposableKeyHandlers.length) {
        const disposableKeyHandler = await addDisposableAuthDescriptor(
          connection,
          usedLoginKeyStore,
          account.id,
          keyStore.createKeyHandler(adminAuthDescriptor),
          flags
        );
        disposableKeyHandlers = [disposableKeyHandler];
      }

      const masterKeyHandlers = authDescriptors.map((authDescriptor) =>
        keyStore.createKeyHandler(authDescriptor)
      );

      const authenticator = createAuthenticator(
        options.accountId,
        [...disposableKeyHandlers, ...masterKeyHandlers],
        authDataService
      );

      return createSession(connection, authenticator);
    },
    logout: (accountId: Buffer) => {
      const loginKeyStore = accountIdKeyStoreMap.get(accountId);
      if (!loginKeyStore) return;
      loginKeyStore.clear(accountId);
    },
  });
}

/*
 * Returns auth flags provided as option to login manager's `login` function,
 * or if they are not provided, the function uses config name to load login config from chain.
 * If configName is null or undefined too, then default login config will be loaded from chain.
 */
async function getFlags(
  authDataService: AuthDataService,
  options: LoginOptions
): Promise<string[]> {
  if (options.config) {
    return options.config.flags;
  } else {
    const loginConfig = await authDataService.getLoginConfig(
      options.configName
    );
    return loginConfig.flags;
  }
}

async function addDisposableAuthDescriptor(
  connection: Connection,
  loginKeyStore: LoginKeyStore,
  accountId: Buffer,
  adminAuthHandler: KeyHandler,
  flags: string[]
): Promise<KeyHandler> {
  const authenticator = createAuthenticator(
    accountId,
    [adminAuthHandler],
    createAuthDataService(connection)
  );

  const session = createSession(connection, authenticator);

  const keyPair = await loginKeyStore.createKeyPair(accountId);
  const ks = createInMemoryFTKeyStore(keyPair);

  const ad = authDescriptor.create.singleSig.withArgs(
    flags,
    keyPair.pubKey
  ).andNoRules;

  await session.account.addAuthDescriptor(ad, keyPair);

  return ks.createKeyHandler(ad);
}
