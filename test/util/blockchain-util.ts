import { generateAssetName, generateAssetSymbol } from "./util";
import {
  createClient as chromiaClient,
  gtv,
  IClient,
  formatter,
} from "postchain-client";
import { createConnection } from "../../client/lib/ft4/ft-session";
import { Asset } from "../../client/lib/ft4/asset/types";
import adminUser from "./admin_user";
import { registerAsset } from "/ft4/admin/admin-op-functions";

export async function createChromiaClient(nodeUrl?: string) {
  const url = nodeUrl || process.env.TEST_NODE_URL || "http://127.0.0.1:7740";
  return chromiaClient({
    nodeURLPool: url,
    blockchainIID: 0,
  });
}

export async function getNewAsset(
  client: IClient,
  name = generateAssetName(),
  symbol = generateAssetSymbol(),
  decimals = 0,
  iconUrl = "",
): Promise<Asset> {
  const adminSignatureProvider = adminUser().signatureProvider;
  await registerAsset(
    client,
    adminSignatureProvider,
    name,
    symbol,
    decimals,
    iconUrl,
  );
  const id = gtv.gtvHash([
    name,
    formatter.ensureBuffer(client.config.blockchainRID),
  ]);
  const asset = await createConnection(client).getAssetById(id);
  if (!asset) {
    throw new Error("Unable to fetch the new asset");
  }
  return asset;
}
