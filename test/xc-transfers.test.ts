import AccountBuilder from "./util/account-builder";
import {blockchainAccountId, generateAssetName, generateId} from "./util/util";
import Asset from "../client/lib/ft3/asset";
import AssetBalance from "../client/lib/ft3/asset-balance";
import TestConnection from "./util/test-connection";
import TestUser from "./util/test-user";

let asset = null;
let connection = new TestConnection();

describe("Cross-chain transfer", () => {
    beforeAll(async () => {
        asset = await Asset.register(generateAssetName(), generateId(), connection);
    });

    it("should succeessfully initialize when there's enough balance on the account", async () => {
        const destinationChainId = generateId();
        const destinationAccountId = generateId();
        const user = TestUser.singleSig();

        const account = await AccountBuilder
            .account(connection, user)
            .withParticipants([user.keyPair])
            .withBalance(asset, 100)
            .build();

        await account.xcTransfer(destinationChainId, destinationAccountId, asset.id, 10);

        const accountBalance = await AssetBalance.getByAccountAndAssetId(account.id_, asset.id, connection);
        const chainBalance = await AssetBalance.getByAccountAndAssetId(
            blockchainAccountId(destinationChainId),
            asset.id,
            connection
        );

        expect(accountBalance.amount).toEqual(90);
        expect(chainBalance.amount).toEqual(10);
    });
});