import { generateAssetName, generateId } from "./util";
import { config } from "dotenv";
import { ftQuerySession, ftUserSession } from "../../client/lib/ft3/interfaces";
import { gtxClient, restClient, restClientutil } from "postchain-client";
import {
  createQuerySession,
  createUserSession,
} from "../../client/lib/ft3/ft-session";
import { Asset } from "../../client/lib/ft3/asset/types";
import singleSigUser from "./test-user";
import { AuthDescriptorRule } from "../../client/lib/ft3/account/auth-descriptor/types";
import adminUser from "./admin_user";
config();

export async function getQuerySession(): Promise<ftQuerySession> {
  const url = process.env.TEST_NODE_URL || "http://localhost:7741";
  const brid = await restClientutil.getBrid(url, 0);
  const client = gtxClient.createClient(
    restClient.createRestClient([url], brid),
    brid,
    []
  );
  return createQuerySession(client);
}

export async function getUserSession(
  rules: AuthDescriptorRule | null = null
): Promise<ftUserSession> {
  const url = process.env.TEST_NODE_URL || "http://localhost:7741";
  const brid = await restClientutil.getBrid(url, 0);
  const client = gtxClient.createClient(
    restClient.createRestClient([url], brid),
    brid,
    []
  );
  return createUserSession(client, singleSigUser(rules));
}

export async function getNewAsset(
  userSession: ftUserSession,
  name = generateAssetName(),
  brid = generateId()
): Promise<Asset> {
  const id = await userSession.asset.admin.register(adminUser(), name, brid);
  const asset = await userSession.get.asset.by.id(id);
  return asset;
}
