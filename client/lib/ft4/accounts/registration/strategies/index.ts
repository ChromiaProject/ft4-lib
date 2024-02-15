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
} from "@ft4/authentication/login-manager";
import { createInMemoryLoginKeyStore } from "@ft4/authentication/login-manager/stores/in-memory";
import { createAuthDataService } from "@ft4/ft-session";
import { Connection } from "@ft4/index";
import { gtv } from "postchain-client";

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
  keyStore: FtKeyStore;
}> {
  const authDataService = createAuthDataService(connection);
  const config = await getConfigFromOptions(authDataService, loginConfig);
  const loginKeyStore = createInMemoryLoginKeyStore();
  const keyStore = await loginKeyStore.generateKey(accountId);
  const authDescriptor = createSingleSigAuthDescriptorRegistration(
    config.flags,
    keyStore.id,
    config.rules,
  );

  return {
    keyStore,
    authDescriptor,
  };
}
