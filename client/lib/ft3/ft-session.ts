import { GtxClient } from "postchain-client/built/src/gtx/interfaces";
import { accountQuerySession, accountUserSession } from "./account";
import { User } from "./account/types";
import { assetQuerySession, assetUserSession } from "./asset";
import { ftQuerySession, ftUserSession } from "./interfaces";

export function createUserSession(pci: GtxClient, user: User): ftUserSession {
  return Object.freeze({
    get: createQuerySession(pci),
    account: accountUserSession(user, pci),
    ...assetUserSession(user, pci),
  });
}

export function createQuerySession(pci: GtxClient): ftQuerySession {
  return Object.freeze({
    gtxClient: pci,
    account: accountQuerySession(pci),
    ...assetQuerySession(pci),
  });
}
