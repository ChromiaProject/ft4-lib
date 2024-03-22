import { FetchAppStructureError } from "./errors";
import { rellAppStructure } from "./queries";
import { Queryable } from "postchain-client";

export async function fetchExposedOperations(
  queryable: Queryable,
): Promise<Set<string>> {
  const appStructureQuery = rellAppStructure();

  const appStructure = await queryable.query(appStructureQuery);

  if (!appStructure?.modules) {
    throw new FetchAppStructureError(
      "Failed to fetch the app structure from Rell",
    );
  }

  const exposedOperations = new Set<string>();

  // Always treat "nop" and "iccf_proof" as an exposed operation
  exposedOperations.add("nop");
  exposedOperations.add("iccf_proof");

  for (const module of Object.values(appStructure.modules)) {
    if (module.operations) {
      for (const operation of Object.values(module.operations)) {
        exposedOperations.add(operation.mount);
      }
    }
  }

  return exposedOperations;
}
