import { generateAssetName } from "./util/util";
import { Connection, ftUserSession } from "../client/lib/ft3/interfaces";
import { getNewAsset, getUserSession } from "./util/blockchain-util";
import { createConnection } from "../client/lib/ft3/ft-session";

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

  it("should be returned when queried by id", async () => {
    const assetName = generateAssetName();
    const brid = ft.get.gtxClient.newTransaction([]).gtx.blockchainRID;
    const assetId = ft.get.asset.id(assetName, brid);
    await getNewAsset(ft, assetName);

    const expectedAsset = await connection.getAssetById(assetId);

    expect(expectedAsset.name).toEqual(assetName);
    expect(expectedAsset.id).toEqual(assetId);
    expect(expectedAsset.brid).toEqual(brid);
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
});
