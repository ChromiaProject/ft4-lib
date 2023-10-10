import { generateAssetName, generateAssetSymbol } from "./util";
import {
  createClient as chromiaClient,
  gtv,
  IClient,
  formatter,
  Operation,
} from "postchain-client";
import { createConnection } from "../../client/lib/ft4/ft-session";
import { Asset } from "../../client/lib/ft4/asset/types";
import adminUser from "./admin_user";
import { registerAsset } from "/ft4/admin/admin-op-functions";
import { BufferId } from "/cryptoUtils";

export async function createChromiaClientToMultichain(
  brid: BufferId,
  nodeUrl?: string,
) {
  const url = nodeUrl || process.env.TEST_NODE_URL || "http://127.0.0.1:7740";
  return chromiaClient({
    directoryNodeURLPool: url,
    blockchainRID: brid.toString("hex"),
  });
}

export async function createChromiaClient(nodeUrl?: string, iid = 0) {
  const url = nodeUrl || process.env.TEST_NODE_URL || "http://127.0.0.1:7740";
  return chromiaClient({
    nodeURLPool: url,
    blockchainIID: iid,
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
  return asset;
}

export function anchoredHandlerCallbackParameters(
  client: IClient,
  operations: Operation[],
  opIndex: number,
) {
  return expect.objectContaining({
    operation: operations[opIndex],
    opIndex,
    tx: expect.objectContaining({
      operations: operations.map((o) => ({ opName: o.name, args: o.args })),
      blockchainRID: Buffer.from(client.config.blockchainRID, "hex"),
      signers: [],
      signatures: [],
    }),
  });
}
