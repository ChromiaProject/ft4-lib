import { FetchAppStructureError } from "./errors";
import { rellAppStructure } from "./queries";
import { Connection } from "../types";

export async function fetchExposedOperations(
  connection: Connection,
): Promise<Set<string>> {
  const appStructureQuery = rellAppStructure();

  const appStructure = await connection.query(appStructureQuery);

  if (!appStructure?.modules) {
    throw new FetchAppStructureError(
      "Failed to fetch the app structure from Rell",
    );
  }

  const exposedOperations = new Set<string>();

  // Always treat "nop" as an exposed operation
  exposedOperations.add("nop");

  for (const module of Object.values(appStructure.modules)) {
    if (module.operations) {
      for (const operation of Object.values(module.operations)) {
        exposedOperations.add(operation.mount);
      }
    }
  }

  return exposedOperations;
}
