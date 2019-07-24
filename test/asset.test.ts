import KeyPair from "../client/lib/cyptoUtils/keyPair";
import {generateAssetName, generateId} from "./util/util";
import Asset from "../client/lib/ft3/asset";


describe("Asset", () => {
    it("should be successfully registered", async () => {
        const asset = await Asset.register(generateAssetName(), generateId());

        expect(asset).not.toBeNull();
    });
});