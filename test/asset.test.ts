import { generateAssetName, generateAssetSymbol } from "./util/util";
import { Connection, ftUserSession } from "../client/lib/ft3/types";
import { getNewAsset, getUserSession } from "./util/blockchain-util";
import { createConnection } from "../client/lib/ft3/ft-session";
import { InvalidUrlError } from "../client/lib/ft3/asset/interfaces";

let ft: ftUserSession;
let connection: Connection;

describe("Asset", () => {
  beforeAll(async () => {
    ft = await getUserSession();
    connection = createConnection(ft.get.gtxClient);
  });

  it("should be successfully registered", async () => {
    const asset = await getNewAsset(ft);
    expect(asset).not.toBeNull();
  });

  it("should be returned when queried by name", async () => {
    const assetName = generateAssetName();
    const asset = await getNewAsset(ft, assetName);

    const expectedAssets = await connection.getAssetsByName(assetName);

    expect(expectedAssets.length).toEqual(1);
    expect(expectedAssets[0]).toEqual(asset);
  });

  it("can fetch paginated assets", async () => {
    const assetName = generateAssetName();
    const client = ft.get.gtxClient;
    const txn = client.newTransaction([]);
    txn.addOperation(
      "register_asset",
      assetName,
      generateAssetSymbol(),
      0,
      Buffer.alloc(32, "a"),
      ""
    );
    txn.addOperation(
      "register_asset",
      assetName,
      generateAssetSymbol(),
      0,
      Buffer.alloc(32, "b"),
      ""
    );
    txn.addOperation(
      "register_asset",
      assetName,
      generateAssetSymbol(),
      0,
      Buffer.alloc(32, "c"),
      ""
    );
    await txn.postAndWaitConfirmation();

    const { data: expectedAssets, nextCursor } =
      await connection.getAssetsByNamePaginated(assetName, 2);
    expect(expectedAssets.length).toEqual(2);
    expect(expectedAssets[0].name).toEqual(assetName);
    expect(expectedAssets[1].name).toEqual(assetName);

    const { data: expectedAssets2 } = await connection.getAssetsByNamePaginated(
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
    const brid = connection.client.newTransaction([]).gtx.blockchainRID;
    const assetId = ft.get.asset.id(assetName, brid);
    await getNewAsset(ft, assetName, assetSymbol, 3);

    const expectedAsset = (await connection.getAssetById(assetId))!;

    expect(expectedAsset.name).toEqual(assetName);
    expect(expectedAsset.id).toEqual(assetId);
    expect(expectedAsset.decimals).toEqual(3);
    expect(expectedAsset.brid).toEqual(brid);
  });

  it("is returned when queried by symbol", async () => {
    const assetName = generateAssetName();
    const assetSymbol = generateAssetSymbol();
    const brid = connection.client.newTransaction([]).gtx.blockchainRID;
    const assetId = ft.get.asset.id(assetName, brid);
    await getNewAsset(ft, assetName, assetSymbol, 3);

    const result = (await connection.getAssetBySymbol(assetSymbol))!;

    expect(result).toMatchObject({
      name: assetName,
      id: assetId,
      decimals: 3,
      brid,
    });
  });

  it("should return all the assets registered", async () => {
    const asset1 = await getNewAsset(ft);
    const asset2 = await getNewAsset(ft);
    const asset3 = await getNewAsset(ft);

    const expectedAssets = await connection.getAllAssets();

    expect(expectedAssets).toEqual(
      expect.arrayContaining([asset1, asset2, asset3])
    );
  });

  it("returns the assets paginated", async () => {
    // Assure that there will always be at least three assets to not make it dependent on execution order
    await getNewAsset(ft);
    await getNewAsset(ft);
    await getNewAsset(ft);

    const { data: page1, nextCursor } = await connection.getAllAssetsPaginated(
      2
    );

    expect(page1.length).toBe(2);
    const { data: page2 } = await connection.getAllAssetsPaginated(
      1,
      nextCursor
    );

    expect(page2.length).toBe(1);
  });

  it("should successfully register with valid icon URL", async () => {
    const validUrl = "https://example.com/icon.png";
    const asset = await getNewAsset(ft, "Test Asset 1", "TST1", 0, validUrl);
    expect(asset).not.toBeNull();
  });

  it("should fail to register with invalid icon URL", async () => {
    const invalidUrl = "not-a-valid-url";
    await expect(
      getNewAsset(ft, "Test Asset 2", "TST2", 0, invalidUrl)
    ).rejects.toThrow(InvalidUrlError);
  });

  it("should successfully register without providing icon URL", async () => {
    const asset = await getNewAsset(ft, "Test Asset 3", "TST3", 0, "");
    expect(asset).not.toBeNull();
  });
});
