import { GtxClient } from "postchain-client";
import { BufferId } from "../../cryptoUtils";
import { getByAuthDescriptorId, getById } from "./account-query-functions";

export * from "./auth";
export * from "./auth-descriptor";
export * from "./transfer-history";
export * from "./types";

export const accountQuerySession = (pci: GtxClient) =>
  Object.freeze({
    by: {
      authDescriptorId: (id: BufferId) => getByAuthDescriptorId(pci, id),
      id: (id: BufferId) => getById(pci, id),
    },
  });
