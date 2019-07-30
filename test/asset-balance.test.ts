import AccountBuilder from "./util/account-builder";
import TestConnection from "./util/test-connection";
import AssetBalance from "../client/lib/ft3/asset-balance";
import Asset from "../client/lib/ft3/asset";
import { generateAssetName, generateId } from "./util/util";

const connection = new TestConnection();
let asset1 = null;
let asset2 = null;

describe('Asset balance', () => {
    beforeAll(async () => {
        asset1 = await Asset.register(generateAssetName(), generateId(), connection);
        asset2 = await Asset.register(generateAssetName(), generateId(), connection);
    });

    it('should be returned when queried by account id', async () => {
        const account = await AccountBuilder
            .account(connection)
            .build();

        await AssetBalance.giveBalance(account.id_, asset1.id, 10, connection);
        await AssetBalance.giveBalance(account.id_, asset2.id, 20, connection);

        const assets = await AssetBalance.getByAccountId(account.id_, connection);

        expect(assets.length).toEqual(2);
    });
});