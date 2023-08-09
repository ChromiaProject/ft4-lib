import { IClient, RawGtv } from "postchain-client";
import { FetchAppStructureError } from "./errors";
import { rellAppStructure } from "./queries";
import { RellAppStructure } from "./types";

let cachedExposedOperations: Set<string> | null = null;

export async function isOperationExposed(
  operation: string,
  client: IClient,
): Promise<boolean> {
  const exposedOperations = await fetchExposedOperations(client);
  console.log("exposedOperations", operation, exposedOperations);
  return exposedOperations.has(operation);
}

async function fetchExposedOperations(client: IClient): Promise<Set<string>> {
  if (cachedExposedOperations) {
    return cachedExposedOperations;
  }

  const appStructureQuery = rellAppStructure();

  const appStructure = (await client.query<null, RawGtv>(
    appStructureQuery,
  )) as unknown as RellAppStructure;

  if (!appStructure || !appStructure.modules) {
    throw new FetchAppStructureError(
      "Failed to fetch the app structure from Rell",
    );
  }

  const exposedOperations = new Set<string>();

  for (const [, module] of Object.entries(appStructure.modules)) {
    if (module.operations) {
      for (const operation in module.operations) {
        exposedOperations.add(operation);
      }
    }
  }

  cachedExposedOperations = exposedOperations;

  return exposedOperations;
}
