import { generateAssetName, generateAssetSymbol } from "./util";
import {
  Connection,
  ftQuerySession,
  ftUserSession,
} from "../../client/lib/ft4/types";
import {
  gtxClient,
  restClient,
  restClientutil,
  createClient as chromiaClient,
  gtv,
  IClient,
  formatter,
} from "postchain-client";
import {
  createConnection,
  createQuerySession,
  createUserSession,
} from "../../client/lib/ft4/ft-session";
import { Asset } from "../../client/lib/ft4/asset/types";
import singleSigUser from "./test-user";
import { AuthDescriptorRule } from "../../client/lib/ft4/accounts/auth-descriptor/types";
import adminUser, { adminKeyPair } from "./admin_user";
import { _registerAssetOp } from "/ft4/asset/asset-dev-operations";

export async function createClient(nodeUrl?: string) {
  const url = nodeUrl || process.env.TEST_NODE_URL || "http://localhost:7740";
  const brid = await restClientutil.getBrid(url, 0);
  return gtxClient.createClient(
    restClient.createRestClient([url], brid),
    brid,
    []
  );
}

export async function createChromiaClient(nodeUrl?: string) {
  const url = nodeUrl || process.env.TEST_NODE_URL || "http://localhost:7740";
  return chromiaClient({
    nodeURLPool: url,
    blockchainIID: 0,
  });
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
  client: IClient,
  name = generateAssetName(),
  symbol = generateAssetSymbol(),
  decimals = 0,
  iconUrl = ""
): Promise<Asset> {
  const adminSignatureProvider = adminUser().signatureProvider;
  await client.signAndSendUniqueTransaction(
    {
      name: "ft4.admin.register_asset",
      args: [name, symbol, decimals, iconUrl],
    },
    adminSignatureProvider
  );
  const id = gtv.gtvHash([
    name,
    formatter.ensureBuffer(client.config.blockchainRID),
  ]);
  const asset = await createConnection(client).getAssetById(id);
  return asset;
}

export async function _getNewAsset(
  connection: Connection,
  name = generateAssetName(),
  symbol = generateAssetSymbol(),
  decimals = 0,
  iconUrl = ""
): Promise<Asset> {
  await connection.client.signAndSendUniqueTransaction(
    _registerAssetOp(name, symbol, decimals, iconUrl),
    adminKeyPair
  );
  const assets = await connection.getAssetsByName(name);
  return assets.data[0];
}
