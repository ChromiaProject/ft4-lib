import { createAuthenticator } from "..";
import { hasAuthDescriptorFlags } from "../ft/key-handler";
import { createInMemoryFtKeyStore } from "../ft/key-stores/in-memory";
import { AuthDataService, KeyHandler, KeyStore } from "../types";
import { createInMemoryLoginKeyStore } from "./stores/in-memory";
import { LoginKeyStore } from "./stores/types";
import { LoginManger, LoginOptions } from "./types";
import { authDescriptorById } from "/ft4/accounts/account-queries";
import { createAccountObject } from "/ft4/accounts/account-query-functions";
import {
  FlagsType,
  createSingleSigAuthDescriptorRegistration,
  deriveAuthDescriptorId,
  gtv,
} from "/ft4/accounts/auth-descriptor";
import { createAuthDataService, createSession } from "/ft4/ft-session";
import { Connection } from "/ft4/types";
import { getPubkey } from "/ft4/utils";

export * from "./types";

export function createLoginManager(
  connection: Connection,
  keyStore: KeyStore,
  loginKeyStore: LoginKeyStore | null = null,
): LoginManger {
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
      const flags = await getFlags(authDataService, loginOptions);

      const keyPair = await usedLoginKeyStore.getKeyPair(account.id);

      // If disposable key pair exists in login key store for provided account id,
      // check if there are already auth descriptors with required flags.
      // If they already exist then it will be used instead of adding a new auth descriptor
      if (keyPair) {
        const disposableKeyStore = createInMemoryFtKeyStore(keyPair);
        const disposableAuthDescriptors =
          await account.getAuthDescriptorsByParticipantId(getPubkey(keyPair));
        disposableKeyHandlers = disposableAuthDescriptors
          // TODO: filter out expired auth descriptors
          .filter((authDescriptor) =>
            // If
            hasAuthDescriptorFlags(authDescriptor, flags),
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
          flags,
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
 * Returns auth flags provided as option to login manager's `login` function,
 * or if they are not provided, the function uses config name to load login config from chain.
 * If configName is null or undefined too, then default login config will be loaded from chain.
 */
async function getFlags(
  authDataService: AuthDataService,
  options: LoginOptions,
): Promise<string[]> {
  if (options.config) {
    return options.config.flags;
  } else {
    const loginConfig = await authDataService.getLoginConfig(
      options.configName,
    );
    return loginConfig?.flags ?? [];
  }
}

async function addDisposableAuthDescriptor(
  connection: Connection,
  loginKeyStore: LoginKeyStore,
  accountId: Buffer,
  adminAuthHandler: KeyHandler,
  flags: string[],
): Promise<KeyHandler> {
  const authenticator = createAuthenticator(
    accountId,
    [adminAuthHandler],
    createAuthDataService(connection),
  );

  const session = createSession(connection, authenticator);

  const keyPair = await loginKeyStore.createKeyPair(accountId);
  const ks = createInMemoryFtKeyStore(keyPair);

  const registration = createSingleSigAuthDescriptorRegistration(
    flags,
    getPubkey(keyPair),
    null,
  );

  await session.account.addAuthDescriptor(registration, keyPair);
  const ad = gtv.mapOneAuthDescriptor(
    await connection.query(
      authDescriptorById(accountId, deriveAuthDescriptorId(registration)),
    ),
  );

  return ks.createKeyHandler(ad);
}
