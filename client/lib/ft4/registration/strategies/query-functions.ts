import * as Query from "./queries";
import { Queryable } from "postchain-client";

export async function getEnabledRegistrationStrategies(
  queryable: Queryable,
): Promise<string[]> {
  return await queryable.query(Query.enabledRegistrationStrategies());
}
