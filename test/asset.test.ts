import {generateAssetName, generateId} from "./util/util";
import Asset from "../client/lib/ft3/asset";
import TestConnection from "./util/test-connection";

const connection = new TestConnection();

describe("Asset", () => {
    it("should be successfully registered", async () => {
        const asset = await Asset.register(generateAssetName(), generateId(), connection);

        expect(asset).not.toBeNull();
    });
});