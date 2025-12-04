import * as Query from "./queries";
import { Queryable } from "postchain-client";
import { ImportConfig } from "./types";

/**
 * Returns a list containing the name of all of the enabled strategies
 * @param queryable - object to use when querying the blockchain
 */
export async function getEnabledRegistrationStrategies(
  queryable: Queryable,
): Promise<string[]> {
  return await queryable.query(Query.enabledRegistrationStrategies());
}

/**
 * Retrieves the import configuration from the blockchain.
 *
 * @param queryable - The object to use when querying the blockchain.
 * @returns A promise that resolves to the import configuration, including trusted chains, timeout, and operation settings.
 */
export async function getImportConfig(
  queryable: Queryable,
): Promise<ImportConfig> {
  const raw = await queryable.query(Query.importConfig());
  return {
    trustedChains: raw.trusted_chains,
    importAccountTimeout: raw.import_account_timeout,
    allowAnyOperation: raw.allow_any_operation,
  };
}
