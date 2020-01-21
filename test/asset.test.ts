import {generateAssetName, generateId} from "./util/util";
import Asset from "../client/lib/ft3/asset";
import Blockchain from "../client/lib/ft3/blockchain";
import BlockchainUtil from "./util/blockchain-util";
import { gtv } from "postchain-client";

let blockchain: Blockchain = null;

describe("Asset", () => {
    const createdAssets = [];
    
    beforeAll(async () => {
        blockchain = await BlockchainUtil.getDefaultBlockchain();
    });

    it("should be successfully registered", async () => {
        const asset = await Asset.register(generateAssetName(), generateId(), blockchain);
        expect(asset).not.toBeNull();

        createdAssets.push(asset);
    });

    it("should be returned when queried by name", async () => {
        const assetName = generateAssetName();
        const asset = await Asset.register(assetName, generateId(), blockchain);

        const expectedAssets = await Asset.getByName(assetName, blockchain);

        expect(expectedAssets.length).toEqual(1);
        expect(expectedAssets[0].id).toEqual(asset.id);

        createdAssets.concat(expectedAssets);
    });

    it("should be returned when queried by id", async () => {
        const assetName = generateAssetName();
        const chainId = generateId();
        const assetId = gtv.gtvHash([assetName, chainId]);
        const asset = await Asset.register(assetName, chainId, blockchain);
        
        const expectedAsset = await Asset.getById(assetId, blockchain);

        expect(expectedAsset.name).toEqual(assetName);
        expect(expectedAsset.id).toEqual(assetId);
        expect(expectedAsset.chainId).toEqual(chainId);

        createdAssets.push(expectedAsset);
    });

    it("should return all the assets registered", async () => {
        const expectedAssets = await Asset.getAssets(blockchain);

        expect(expectedAssets).toEqual(
            expect.arrayContaining(createdAssets)
        );
    });
});