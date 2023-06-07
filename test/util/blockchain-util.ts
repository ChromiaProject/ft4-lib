import { generateAssetName, generateAssetSymbol, generateId } from "./util";
import { ftQuerySession, ftUserSession } from "../../client/lib/ft3/types";
import { gtxClient, restClient, restClientutil } from "postchain-client";
import {
  createQuerySession,
  createUserSession,
} from "../../client/lib/ft3/ft-session";
import { Asset } from "../../client/lib/ft3/asset/types";
import singleSigUser from "./test-user";
import { AuthDescriptorRule } from "../../client/lib/ft3/account/auth-descriptor/types";

export async function createClient(nodeUrl?: string) {
  const url = nodeUrl || process.env.TEST_NODE_URL || "http://localhost:7740";
  const brid = await restClientutil.getBrid(url, 0);
  return gtxClient.createClient(
    restClient.createRestClient([url], brid),
    brid,
    []
  );
}

export async function getQuerySession(): Promise<ftQuerySession> {
  const client = await createClient();
  return createQuerySession(client);
}

export async function getUserSession(
  rules: AuthDescriptorRule | null = null
): Promise<ftUserSession> {
  const client = await createClient();
  return createUserSession(client, singleSigUser(rules));
}

export async function getNewAsset(
  userSession: ftUserSession,
  name = generateAssetName(),
  symbol = generateAssetSymbol(),
  decimals = 0,
  brid = generateId(),
  iconUrl = ""
): Promise<Asset> {
  const id = await userSession.asset.dev.register(
    name,
    symbol,
    decimals,
    brid,
    iconUrl
  );
  const asset = await userSession.get.asset.by.id(id);
  return asset;
}
