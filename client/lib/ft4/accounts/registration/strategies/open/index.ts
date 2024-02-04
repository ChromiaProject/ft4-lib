import { RegistrationDetails, Strategy } from "../../types";
import {
  AnyAuthDescriptorRegistration,
  aggregateSigners,
  createSingleSigAuthDescriptorRegistration,
} from "@ft4/accounts/auth-descriptor";
import { authDescriptorRegistrationToGtv } from "@ft4/accounts/auth-descriptor/gtv";
import { gtv } from "postchain-client";
import {
  LoginConfigOptions,
  LoginKeyStore,
  getFlags,
} from "@ft4/authentication/login-manager";
import { Connection } from "@ft4/types";
import { createAuthDataService } from "@ft4/ft-session";
import { RawAnyAuthDescriptorRegistration } from "@ft4/accounts/auth-descriptor/types";
import { createInMemoryLoginKeyStore } from "@ft4/authentication/login-manager/stores/in-memory";
import { FtKeyStore, createInMemoryFtKeyStore } from "@ft4/authentication";

export function open(
  authDescriptor: AnyAuthDescriptorRegistration,
  loginConfig: LoginConfigOptions | null = null,
): Strategy {
  return Object.freeze({
    getRegistrationDetails: async (
      connection: Connection,
    ): Promise<RegistrationDetails> => {
      let disposableAuthDescriptor: RawAnyAuthDescriptorRegistration | null =
        null;

      let loginKeyStore: LoginKeyStore | null = null;
      let disposableKeyStore: FtKeyStore | null = null;

      const accountId = getAccountIdFromSigners(
        aggregateSigners(authDescriptor),
      );

      if (loginConfig) {
        const authDataService = createAuthDataService(connection);
        const flags = await getFlags(authDataService, loginConfig);
        loginKeyStore = createInMemoryLoginKeyStore();
        const keyPair = await loginKeyStore.createKeyPair(accountId);
        disposableKeyStore = createInMemoryFtKeyStore(keyPair);
        disposableAuthDescriptor = authDescriptorRegistrationToGtv(
          createSingleSigAuthDescriptorRegistration(flags, keyPair.pubKey),
        );
      }

      const operation = {
        name: "ft4.ras_open",
        args: [
          authDescriptorRegistrationToGtv(authDescriptor),
          disposableAuthDescriptor,
        ],
      };

      return {
        strategyOperation: operation,
        loginKeyStore: disposableKeyStore,
      };
    },
  });
}

export function getAccountIdFromSigners(signers: Buffer[]): Buffer {
  if (!signers.length)
    throw new Error("Cannot derive account id. Signers list is empty");

  return gtv.gtvHash(signers.length === 1 ? signers[0] : signers);
}
