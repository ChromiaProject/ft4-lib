import * as Query from "./queries";
import { Queryable } from "postchain-client";

/**
 * Returns a list containing the name of all of the enabled strategies
 * @param queryable - object to use when querying the blockchain
 */
export async function getEnabledRegistrationStrategies(
  queryable: Queryable,
): Promise<string[]> {
  return await queryable.query(Query.enabledRegistrationStrategies());
}
