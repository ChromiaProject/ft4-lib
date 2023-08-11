import { generateAssetName, generateAssetSymbol } from "./util/util";
import { Connection } from "../client/lib/ft4/types";
import { createChromiaClient, getNewAsset } from "./util/blockchain-util";
import { InvalidUrlError } from "../client/lib/ft4/asset/interfaces";
import { createConnection } from "../client/lib/ft4/ft-session";
import { Buffer } from "buffer";
import { IClient, gtv } from "postchain-client";
import { randomBytes } from "crypto";
import { op } from "/ft4";
import adminUser, { adminKeyPair } from "./util/admin_user";
import { registerAsset } from "/ft4/admin/admin-op-functions";

let connection: Connection;
let client: IClient;

//used only to have different issuing_brid until we have xchain
async function registerAssetWithRandomBrid(
  client: IClient,
  assetName: string,
  decimals = 0,
  blockchainRID: Buffer = randomBytes(32)
) {
  const txn = {
    operations: [
      op(
        "register_asset",
        assetName,
        generateAssetSymbol(),
        decimals,
        blockchainRID,
        ""
      ),
    ],
    signers: [adminKeyPair.pubKey],
  };
  await client.signAndSendUniqueTransaction(txn, adminKeyPair);
}

describe("Asset", () => {
  beforeAll(async () => {
    client = await createChromiaClient();
    connection = createConnection(client);
  });

  it("should be successfully registered", async () => {
    const asset = await getNewAsset(client);
    expect(asset).not.toBeNull();
  });

  it("should be returned when queried by name", async () => {
    const assetName = generateAssetName();
    const asset = await getNewAsset(client, assetName);

    const expectedAssets = await connection.getAssetsByName(assetName);

    expect(expectedAssets.data.length).toEqual(1);
    expect(expectedAssets.data[0]).toEqual(asset);
  });

  it("can fetch paginated assets by name", async () => {
    const assetName = generateAssetName();
    await registerAssetWithRandomBrid(client, assetName);
    await registerAssetWithRandomBrid(client, assetName);
    await registerAssetWithRandomBrid(client, assetName);

    const { data: expectedAssets, nextCursor } =
      await connection.getAssetsByName(assetName, 2);
    expect(expectedAssets.length).toEqual(2);
    expect(expectedAssets[0].name).toEqual(assetName);
    expect(expectedAssets[1].name).toEqual(assetName);

    const { data: expectedAssets2 } = await connection.getAssetsByName(
      assetName,
      2,
      nextCursor
    );
    expect(expectedAssets2.length).toEqual(1);
    expect(expectedAssets2[0].name).toEqual(assetName);
  });

  it("should be returned when queried by id", async () => {
    const assetName = generateAssetName();
    const assetSymbol = generateAssetSymbol();
    const brid = Buffer.from(connection.client.config.blockchainRID, "hex");
    const assetId = gtv.gtvHash([assetName, brid]);
    await getNewAsset(client, assetName, assetSymbol, 3);

    const expectedAsset = await connection.getAssetById(assetId);

    expect(expectedAsset.name).toEqual(assetName);
    expect(expectedAsset.id).toEqual(assetId);
    expect(expectedAsset.decimals).toEqual(3);
    expect(expectedAsset.brid).toEqual(brid);
  });

  it("is returned when queried by symbol", async () => {
    const assetName = generateAssetName();
    const assetSymbol = generateAssetSymbol();
    const brid = Buffer.from(connection.client.config.blockchainRID, "hex");
    const assetId = gtv.gtvHash([assetName, brid]);
    await getNewAsset(client, assetName, assetSymbol, 3);

    const result = (await connection.getAssetBySymbol(assetSymbol))!;

    expect(result).toMatchObject({
      name: assetName,
      id: assetId,
      decimals: 3,
      brid,
    });
  });

  it("should return all the assets registered", async () => {
    const asset1 = await getNewAsset(client);
    const asset2 = await getNewAsset(client);
    const asset3 = await getNewAsset(client);

    const expectedAssets = await connection.getAllAssets();

    expect(expectedAssets.data).toEqual(
      expect.arrayContaining([asset1, asset2, asset3])
    );
  });

  it("returns the assets paginated", async () => {
    // Assure that there will always be at least three assets to not make it dependent on execution order
    await getNewAsset(client);
    await getNewAsset(client);
    await getNewAsset(client);

    const { data: page1, nextCursor } = await connection.getAllAssets(2);

    expect(page1.length).toBe(2);
    const { data: page2 } = await connection.getAllAssets(1, nextCursor);

    expect(page2.length).toBe(1);
  });

  it("should successfully register with valid icon URL", async () => {
    const validUrl = "https://example.com/icon.png";
    const asset = await getNewAsset(
      client,
      "Test Asset 1",
      "TST1",
      0,
      validUrl
    );
    expect(asset).not.toBeNull();
  });

  // Update after addding new admin functions
  it("should fail to register with invalid icon URL", async () => {
    const adminSignatureProvider = adminUser().signatureProvider;
    const wrapper = async () =>
      registerAsset(
        client,
        adminSignatureProvider,
        "Test Asset 2",
        "TST2",
        0,
        "not-a-valid-url"
      );

    await expect(wrapper()).rejects.toThrow(InvalidUrlError);
  });

  it("should successfully register without providing icon URL", async () => {
    const asset = await getNewAsset(client, "Test Asset 3", "TST3", 0, "");
    expect(asset).not.toBeNull();
  });
});
