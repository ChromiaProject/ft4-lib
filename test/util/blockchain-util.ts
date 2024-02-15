import {
  createClient as chromiaClient,
  gtv,
  IClient,
  formatter,
  Operation,
} from "postchain-client";
import { createConnection } from "@ft4/ft-session";
import { Asset } from "@ft4/asset/types";
import adminUser from "./admin_user";
import { registerAsset } from "@ft4/admin/admin-op-functions";
import { BufferId } from "@ft4/utils/types";
import { createClient } from "postchain-client";

export async function createChromiaClientToMultichain(
  blockchainRid: BufferId,
  nodeUrl?: string,
) {
  const url = nodeUrl || process.env.TEST_NODE_URL || "http://127.0.0.1:7740";
  return chromiaClient({
    directoryNodeUrlPool: url,
    blockchainRid: blockchainRid.toString("hex"),
  });
}

export async function createChromiaClient(nodeUrl?: string, iid = 0) {
  const url = nodeUrl || process.env.TEST_NODE_URL || "http://127.0.0.1:7740";
  return chromiaClient({
    nodeUrlPool: url,
    blockchainIid: iid,
  });
}

export async function createStubClient() {
  return createClient({
    nodeUrlPool: "http://127.0.0.1:7740",
    blockchainRid:
      "0000000000000000000000000000000000000000000000000000000000000000",
  });
}

export async function getNewAsset(
  client: IClient,
  name: string,
  symbol: string,
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
    formatter.ensureBuffer(client.config.blockchainRid),
  ]);
  const asset = await createConnection(client).getAssetById(id);
  if (!asset) {
    throw new Error("Unable to fetch the new asset");
  }
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
    tx: expect.arrayContaining([
      [
        Buffer.from(client.config.blockchainRid, "hex"),
        operations.map((o) => [o.name, o.args]),
        expect.any(Array),
      ],
      expect.any(Array),
    ]),
  });
}
