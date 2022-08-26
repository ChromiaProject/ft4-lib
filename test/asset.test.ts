import { generateAssetName, generateId } from "./util/util";
import Asset from "../client/lib/ft3/user/asset";
import Blockchain from "../client/lib/ft3/core/blockchain/blockchain";
import BlockchainUtil from "./util/blockchain-util";
import { gtv } from "postchain-client";

let blockchain: Blockchain;

describe("Asset", () => {
  beforeAll(async () => {
    blockchain = await BlockchainUtil.getDefaultBlockchain();
  });

  it("should be successfully registered", async () => {
    const asset = await BlockchainUtil.getNewAsset(blockchain);
    expect(asset).not.toBeNull();
  });

  it("should be returned when queried by name", async () => {
    const assetName = generateAssetName();
    const asset = await BlockchainUtil.getNewAsset(blockchain, assetName);

    const expectedAssets = await Asset.getByName(assetName, blockchain);

    expect(expectedAssets.length).toEqual(1);
    expect(expectedAssets[0]).toEqual(asset);
  });

  it("should be returned when queried by id", async () => {
    const assetName = generateAssetName();
    const brid = generateId();
    const assetId = gtv.gtvHash([assetName, brid]);
    await BlockchainUtil.getNewAsset(blockchain, assetName, brid);

    const expectedAsset = await Asset.getById(assetId, blockchain);

    expect(expectedAsset.name).toEqual(assetName);
    expect(expectedAsset.id).toEqual(assetId);
    expect(expectedAsset.brid).toEqual(brid);
  });

  it("should return all the assets registered", async () => {
    const asset1 = await BlockchainUtil.getNewAsset(blockchain);
    const asset2 = await BlockchainUtil.getNewAsset(blockchain);
    const asset3 = await BlockchainUtil.getNewAsset(blockchain);

    const expectedAssets = await Asset.getAssets(blockchain);

    expect(expectedAssets).toEqual(
      expect.arrayContaining([asset1, asset2, asset3])
    );
  });
});
