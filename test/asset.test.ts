import {generateAssetName, generateId} from "./util/util";
import Asset from "../client/lib/ft3/asset";
import TestConnection from "./util/test-connection";

const connection = new TestConnection();

describe("Asset", () => {
    it("should be successfully registered", async () => {
        const asset = await Asset.register(generateAssetName(), generateId(), connection);

        expect(asset).not.toBeNull();
    });

    it("should be returned when queried by name", async () => {
        const assetName = generateAssetName();
        const asset = await Asset.register(assetName, generateId(), connection);

        const assets = await Asset.getByName(assetName, connection);

        expect(assets.length).toEqual(1);
        expect(assets[0].id).toEqual(asset.id);
    });
});