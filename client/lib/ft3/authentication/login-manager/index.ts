import { createAuthenicator } from "..";
import { createInMemoryFTKeyStore } from "../ft/key-stores/in-memory";
import { KeyStore } from "../types";
import { LoginManger, LoginOptions } from "./types";
import { KeyPair } from "/cryptoUtils";
import { createAccountObject } from "/ft3/account/account-query-functions";
import { FlagsType, authDescriptor } from "/ft3/account/auth-descriptor";
import { createAuthDataService, createSession } from "/ft3/ft-session";
import { Connection } from "/ft3/types";

export * from "./types";

export function createLoginManager(
  connection: Connection,
  keyStore: KeyStore
): LoginManger {
  return Object.freeze({
    login: async (options: LoginOptions) => {
      const account = createAccountObject(connection, options.accountId);
      const authDescriptors = await account.getAuthDescriptorsByParticipantId(
        keyStore.id
      );

      const hasAdminAuthDescriptor =
        authDescriptors.find((authDescriptor) =>
          authDescriptor.flags.has(FlagsType.Account)
        ) !== undefined;

      if (!hasAdminAuthDescriptor) {
        throw new Error(
          `Admin auth descriptor does not exist for provided key store <${keyStore.id.toString(
            "hex"
          )}>`
        );
      }

      const keyHandlers = authDescriptors.map((authDescriptor) =>
        keyStore.createKeyHandler(authDescriptor)
      );

      const authenticator = createAuthenicator(
        options.accountId,
        keyHandlers,
        createAuthDataService(connection)
      );

      const session = createSession(connection, authenticator);

      let flags;
      if (options.flags) {
        flags = options.flags;
      } else {
        const authDataService = createAuthDataService(connection);
        const loginConfig = await authDataService.getLoginConfig(
          options.configName
        );
        flags = loginConfig.flags;
      }

      const keyPair = new KeyPair();
      const ks = createInMemoryFTKeyStore(keyPair);

      const ad = authDescriptor.create.singleSig.withArgs(
        flags,
        keyPair.pubKey
      ).andNoRules;
      const disposableKeyHandler = ks.createKeyHandler(ad);

      await session.account.addAuthDescriptor(ad, keyPair);

      const authenticator2 = createAuthenicator(
        options.accountId,
        [disposableKeyHandler, ...keyHandlers],
        createAuthDataService(connection)
      );

      return createSession(connection, authenticator2);
    },
    //eslint-disable-next-line
    logout: () => {},
  });
}
