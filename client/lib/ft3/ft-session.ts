import { GtxClient } from "postchain-client/built/src/gtx/interfaces";
import { accountQuerySession, accountUserSession } from "./account";
import { User } from "./account/types";
import { assetQuerySession, assetUserSession } from "./asset";
import { ftQuerySession, ftUserSession, Connection } from "./interfaces";
import { getChainInfo, getLastTimestamp, getVersion } from "./utils";
import { BufferId } from "../cryptoUtils";
import {
  _getByParticipantId,
  _getByAuthDescriptorId,
  _getById,
} from "./account/account-query-functions";
import { QueryObject } from "./utils/types";
import {
  _getAllAssets,
  _getAssetById,
  _getAssetsByName,
} from "./asset/asset-query-functions";

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

export function createConnection(client: GtxClient): Connection {
  const connection = Object.freeze({
    client,
    query: <T>(queryObject: QueryObject) => query<T>(connection, queryObject),

    getAccountById: (id: BufferId) => _getById(connection, id),
    getAccountsByParticipantId: (id: BufferId) =>
      _getByParticipantId(connection, id),
    getAccountsByAuthDescriptorId: (id: BufferId) =>
      _getByAuthDescriptorId(connection, id),

    getAssetById: (id: BufferId) => _getAssetById(connection, id),
    getAssetsByName: (name: string) => _getAssetsByName(connection, name),
    getAllAssets: () => _getAllAssets(connection),
  });

  return connection;
}

async function query<T>(
  connection: Connection,
  queryObject: QueryObject
): Promise<T | null> {
  return await connection.client.query(queryObject.name, queryObject.args);
}
