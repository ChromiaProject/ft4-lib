import {generateAssetName, generateId} from "./util/util";
import Asset from "../client/lib/ft3/asset";
import Blockchain from "../client/lib/ft3/blockchain";
import BlockchainUtil from "./util/blockchain-util";

let blockchain: Blockchain = null;

describe("Asset", () => {
    beforeAll(async () => {
        blockchain = await BlockchainUtil.getDefaultBlockchain();
    });

    it("should be successfully registered", async () => {
        const asset = await Asset.register(generateAssetName(), generateId(), blockchain);

        expect(asset).not.toBeNull();
    });

    it("should be returned when queried by name", async () => {
        const assetName = generateAssetName();
        const asset = await Asset.register(assetName, generateId(), blockchain);

        const assets = await Asset.getByName(assetName, blockchain);

        expect(assets.length).toEqual(1);
        expect(assets[0].id).toEqual(asset.id);
    });
});