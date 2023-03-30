import { generateAssetName, generateId } from "./util/util";
import { ftUserSession } from "../client/lib/ft3/interfaces";
import { getNewAsset, getUserSession } from "./util/blockchain-util";

let ft: ftUserSession;

describe("Asset", () => {
  beforeAll(async () => {
    ft = await getUserSession();
  });

  it("should be successfully registered", async () => {
    const asset = await getNewAsset(ft);
    expect(asset).not.toBeNull();
  });

  it("should be returned when queried by name", async () => {
    const assetName = generateAssetName();
    const asset = await getNewAsset(ft, assetName);

    const expectedAssets = await ft.get.asset.by.name(assetName);

    expect(expectedAssets.length).toEqual(1);
    expect(expectedAssets[0]).toEqual(asset);
  });

  it("should be returned when queried by id", async () => {
    const assetName = generateAssetName();
    const brid = generateId();
    const assetId = ft.get.asset.id(assetName, brid);
    await getNewAsset(ft, assetName, brid);

    const expectedAsset = await ft.get.asset.by.id(assetId);

    expect(expectedAsset.name).toEqual(assetName);
    expect(expectedAsset.id).toEqual(assetId);
    expect(expectedAsset.brid).toEqual(brid);
  });

  it("should return all the assets registered", async () => {
    const asset1 = await getNewAsset(ft);
    const asset2 = await getNewAsset(ft);
    const asset3 = await getNewAsset(ft);

    const expectedAssets = await ft.get.asset.all();

    expect(expectedAssets).toEqual(
      expect.arrayContaining([asset1, asset2, asset3])
    );
  });
});
