import {
  adminKeyPair,
  adminUser,
  getNewAsset,
  registerCrosschainAsset,
  useChromiaNode,
} from "@ft4-test/util";
import { registerAsset } from "@ft4/admin";
import { InvalidUrlError } from "@ft4/asset";
import { Connection, createConnection } from "@ft4/ft-session";
import { op } from "@ft4/utils";
import { Buffer } from "buffer";
import { randomBytes } from "crypto";
import { IClient, formatter, gtv } from "postchain-client";

let connection: Connection;
let client: IClient;

//used only to have different issuing_blockchain_rid without using xchain
async function registerAssetWithCustomBlockchainRid(
  client: IClient,
  assetName: string,
  decimals = 0,
  blockchainRid: Buffer = randomBytes(32),
) {
  const txn = {
    operations: [
      op(
        "register_asset",
        assetName,
        assetName + "_" + formatter.toString(blockchainRid),
        decimals,
        blockchainRid,
        "",
      ),
    ],
    signers: [adminKeyPair.pubKey],
  };
  await client.signAndSendUniqueTransaction(txn, adminKeyPair);
}

describe("Asset", () => {
  const getClient = useChromiaNode();

  beforeAll(async () => {
    client = getClient();
    connection = createConnection(client);
  });

  it("successfully registers an asset", async () => {
    const asset = await getNewAsset(client, "asset_1", "ASSET_1");
    expect(asset).not.toBeNull();
  });

  it("returns an asset when queried by name", async () => {
    const assetName = "asset_query";
    const asset = await getNewAsset(client, assetName, assetName.toUpperCase());

    const expectedAssets = await connection.getAssetsByName(assetName);

    expect(expectedAssets.data.length).toEqual(1);
    expect(expectedAssets.data[0]).toEqual(asset);
  });

  it("can fetch paginated assets by name", async () => {
    const assetName = "asset_name";
    await registerAssetWithCustomBlockchainRid(client, assetName);
    await registerAssetWithCustomBlockchainRid(client, assetName);
    await registerAssetWithCustomBlockchainRid(client, assetName);

    const { data: expectedAssets, nextCursor } =
      await connection.getAssetsByName(assetName, 2);
    expect(expectedAssets.length).toEqual(2);
    expect(expectedAssets[0].name).toEqual(assetName);
    expect(expectedAssets[1].name).toEqual(assetName);

    const { data: expectedAssets2 } = await connection.getAssetsByName(
      assetName,
      2,
      nextCursor,
    );
    expect(expectedAssets2.length).toEqual(1);
    expect(expectedAssets2[0].name).toEqual(assetName);
  });

  it("returns an asset when queried by id", async () => {
    const assetName = "asset_id";
    const assetSymbol = "ASSET_ID";
    const blockchainRid = Buffer.from(
      connection.client.config.blockchainRid,
      "hex",
    );
    const assetId = gtv.gtvHash([assetName, blockchainRid]);
    await getNewAsset(client, assetName, assetSymbol, 3);

    const expectedAsset = await connection.getAssetById(assetId);

    expect(expectedAsset!.name).toEqual(assetName);
    expect(expectedAsset!.id).toEqual(assetId);
    expect(expectedAsset!.decimals).toEqual(3);
    expect(expectedAsset!.blockchainRid).toEqual(blockchainRid);
  });

  it("returns an asset when queried by symbol", async () => {
    const assetName = "asset_symbol";
    const assetSymbol = "ASSET_SYMBOL";
    const blockchainRid = Buffer.from(
      connection.client.config.blockchainRid,
      "hex",
    );
    const assetId = gtv.gtvHash([assetName, blockchainRid]);
    const iconUrl = "http://example.com/";
    await getNewAsset(client, assetName, assetSymbol, 3, iconUrl);

    const crosschainAssetId = formatter.ensureBuffer("12".repeat(32));
    const crosschainAssetName = "Some asset";
    const crosschainAssetSymbol = assetSymbol;
    const crosschainAssetDecimals = 6;
    const crosschainBlockchainRid = formatter.ensureBuffer("343434");
    const crosschainIconUrl = "";
    const crosschainAssetType = "FT4";
    const crosschainRes = gtv.gtvHash([
      crosschainAssetName,
      crosschainBlockchainRid,
    ]);

    await registerCrosschainAsset(
      connection,
      adminUser().signatureProvider,
      {
        id: crosschainAssetId,
        name: crosschainAssetName,
        symbol: crosschainAssetSymbol,
        decimals: crosschainAssetDecimals,
        blockchainRid: crosschainBlockchainRid,
        iconUrl: crosschainIconUrl,
        type: crosschainAssetType,
        uniquenessResolver: crosschainRes,
      },
      formatter.ensureBuffer("989898"),
    );

    const page1 = await connection.getAssetsBySymbol(assetSymbol, 1);

    expect(page1.data.length).toBe(1);
    expect(page1.data[0]).toMatchObject({
      name: assetName,
      id: assetId,
      decimals: 3,
      blockchainRid,
      iconUrl,
    });

    const page2 = await connection.getAssetsBySymbol(
      assetSymbol,
      1,
      page1.nextCursor,
    );
    expect(page2.data.length).toBe(1);
    expect(page2.data[0]).toMatchObject({
      id: crosschainAssetId,
      name: crosschainAssetName,
      symbol: crosschainAssetSymbol,
      blockchainRid: crosschainBlockchainRid,
      iconUrl: crosschainIconUrl,
      type: crosschainAssetType,
    });

    expect(page2.nextCursor).toBeNull();
  });

  it("returns all the assets registered when calling getAllAssets()", async () => {
    const asset1 = await getNewAsset(client, "asset_2", "ASSET_2");
    const asset2 = await getNewAsset(client, "asset_3", "ASSET_3");
    const asset3 = await getNewAsset(client, "asset_4", "ASSET_4");

    const expectedAssets = await connection.getAllAssets();

    expect(expectedAssets.data).toEqual(
      expect.arrayContaining([asset1, asset2, asset3]),
    );
  });

  it("returns the assets paginated", async () => {
    // Assure that there will always be at least three assets to not make it dependent on execution order
    await getNewAsset(client, "asset_5", "ASSET_5");
    await getNewAsset(client, "asset_6", "ASSET_6");
    await getNewAsset(client, "asset_7", "ASSET_7");

    const { data: page1, nextCursor } = await connection.getAllAssets(2);

    expect(page1.length).toBe(2);
    const { data: page2 } = await connection.getAllAssets(1, nextCursor);

    expect(page2.length).toBe(1);
  });

  it("successfully registers an asset with valid icon URL", async () => {
    const validUrl = "https://example.com/icon.png";
    const asset = await getNewAsset(
      client,
      "Test Asset 1",
      "TST1",
      0,
      validUrl,
    );
    expect(asset).not.toBeNull();
    expect(asset.iconUrl).toBe(validUrl);
  });

  // Update after adding new admin functions
  it("fails to register an asset with invalid icon URL", async () => {
    const wrapper = async () =>
      registerAsset(
        client,
        adminUser().signatureProvider,
        "Test Asset 2",
        "TST2",
        0,
        "not-a-valid-url",
      );

    await expect(wrapper()).rejects.toThrow(InvalidUrlError);
  });

  it("successfully registers an asset without providing icon URL", async () => {
    const asset = await getNewAsset(client, "Test Asset 3", "TST3", 0, "");
    expect(asset).not.toBeNull();
  });
});
