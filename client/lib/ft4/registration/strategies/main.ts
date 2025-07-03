import {
  AnyAuthDescriptorRegistration,
  aggregateSigners,
  createSingleSigAuthDescriptorRegistration,
} from "@ft4/accounts";
import {
  LoginConfigOptions,
  createInMemoryLoginKeyStore,
  getConfigFromOptions,
} from "@ft4/authentication";
import { Connection, createAuthDataService } from "@ft4/ft-session";
import { Buffer } from "buffer";
import { gtv, MERKLE_HASH_VERSIONS } from "postchain-client";
import { LoginDetails } from "./types";

/**
 * Fetches the login details for an auth descriptor.
 *
 * If no login config options are provided then this function will
 * only return the account id associated with the auth descriptor.
 *
 * In order to also get login details, login config options can be
 * provided. In which case, the caller can specify either which
 * config to load from the blockchain, or provide their own.
 * @param connection - client to use when calling the blockchain
 * @param authDescriptor - the auth descriptor for which to fetch login details
 * @param loginConfig - optional login config to override
 * @remarks If no config object is provided, the resulting login details will also be null
 */
export async function fetchLoginDetails(
  connection: Connection,
  authDescriptor: AnyAuthDescriptorRegistration,
  loginConfig: LoginConfigOptions | null = null,
): Promise<{
  accountId: Buffer;
  loginDetails: LoginDetails | null;
}> {
  const accountId = getAccountIdFromSigners(aggregateSigners(authDescriptor));

  return {
    accountId,
    loginDetails:
      loginConfig &&
      (await getLoginDetails(connection, accountId, loginConfig)),
  };
}

function getAccountIdFromSigners(signers: Buffer[]): Buffer {
  if (!signers.length)
    throw new Error("Cannot derive account id. Signers list is empty");

  return gtv.gtvHash(
    signers.length === 1 ? signers[0] : signers,
    MERKLE_HASH_VERSIONS.ONE,
  );
}

/**
 * Fetches the login details of an account
 * @param connection - the client to use when calling the blockchain
 * @param accountId - the id of the account for which to fetch login details
 * @param loginConfig - the config to use when fetching login details
 */
export async function getLoginDetails(
  connection: Connection,
  accountId: Buffer,
  loginConfig: LoginConfigOptions,
): Promise<LoginDetails> {
  const authDataService = createAuthDataService(connection);
  const config = await getConfigFromOptions(
    authDataService,
    loginConfig,
    connection,
  );
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
