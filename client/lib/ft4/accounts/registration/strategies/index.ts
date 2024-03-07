import {
  AuthDescriptorRegistration,
  SingleSig,
  createSingleSigAuthDescriptorRegistration,
} from "@ft4/accounts/auth-descriptor";
import { Buffer } from "buffer";
import { FtKeyStore } from "@ft4/authentication";
import {
  LoginConfigOptions,
  getConfigFromOptions,
} from "../../../authentication/login";
import { createInMemoryLoginKeyStore } from "@ft4/authentication/login/stores/in-memory";
import { createAuthDataService } from "@ft4/ft-session";
import { Connection } from "@ft4/index";
import { gtv } from "postchain-client";
import { LoginKeyStore } from "../../../authentication/login";
import { AnyAuthDescriptorRegistration } from "@ft4/accounts/auth-descriptor";
import { aggregateSigners } from "@ft4/accounts/auth-descriptor";

export async function fetchLoginDetails(
  connection: Connection,
  authDescriptor: AnyAuthDescriptorRegistration,
  loginConfig: LoginConfigOptions | null = null,
): Promise<{
  accountId: Buffer;
  loginDetails: {
    authDescriptor: AuthDescriptorRegistration<SingleSig>;
    loginKeyStore: LoginKeyStore;
    disposableKeyStore: FtKeyStore;
  } | null;
}> {
  const accountId = getAccountIdFromSigners(aggregateSigners(authDescriptor));

  return {
    accountId,
    loginDetails:
      loginConfig &&
      (await getLoginDetails(connection, accountId, loginConfig)),
  };
}

export function getAccountIdFromSigners(signers: Buffer[]): Buffer {
  if (!signers.length)
    throw new Error("Cannot derive account id. Signers list is empty");

  return gtv.gtvHash(signers.length === 1 ? signers[0] : signers);
}

export async function getLoginDetails(
  connection: Connection,
  accountId: Buffer,
  loginConfig: LoginConfigOptions,
): Promise<{
  authDescriptor: AuthDescriptorRegistration<SingleSig>;
  loginKeyStore: LoginKeyStore;
  disposableKeyStore: FtKeyStore;
}> {
  const authDataService = createAuthDataService(connection);
  const config = await getConfigFromOptions(authDataService, loginConfig);
  const loginKeyStore =
    loginConfig.loginKeyStore || createInMemoryLoginKeyStore();
  const disposableKeyStore = await loginKeyStore.generateKey(accountId);
  const authDescriptor = createSingleSigAuthDescriptorRegistration(
    config.flags,
    disposableKeyStore.id,
    config.rules,
  );

  return {
    authDescriptor,
    loginKeyStore,
    disposableKeyStore,
  };
}
