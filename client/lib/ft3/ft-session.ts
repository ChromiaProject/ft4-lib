import { GtxClient } from "postchain-client/built/src/gtx/interfaces";
import { accountQuerySession, accountUserSession } from "./account";
import { User } from "./account/types";
import { assetQuerySession, assetUserSession } from "./asset";
import { ftQuerySession, ftUserSession } from "./interfaces";
import { getChainInfo, getLastTimestamp, getVersion } from "./utils";

export function createUserSession(pci: GtxClient, user: User): ftUserSession {
  return Object.freeze({
    user,
    changeUser: (newUser: User) => createUserSession(pci, newUser),
    get: createQuerySession(pci),
    account: accountUserSession(user, pci),
    ...assetUserSession(user, pci),
  });
}

export function createQuerySession(pci: GtxClient): ftQuerySession {
  return Object.freeze({
    gtxClient: pci,
    createUserSession: (user: User) => createUserSession(pci, user),
    chainInfo: () => getChainInfo(pci),
    version: () => getVersion(pci),
    lastTimestamp: () => getLastTimestamp(pci),
    account: accountQuerySession(pci),
    ...assetQuerySession(pci),
  });
}
