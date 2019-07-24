import KeyPair from "../client/lib/cyptoUtils/keyPair";
import AccountBuilder from "./util/account-builder";
import {blockchainAccountId, generateAssetName, generateId} from "./util/util";
import Asset from "../client/lib/ft3/asset";
import {gtx} from "../client/blockchain";
import AssetBalance from "../client/lib/ft3/asset-balance";

let asset = null;

describe("Cross-chain transfer", () => {
    beforeAll(async () => {
        asset = await Asset.register(generateAssetName(), generateId());
    });

    it("should succeessfully initialize when there's enough balance on the account", async () => {
        const destinationChainId = generateId();
        const destinationAccountId = generateId();
        const user = new KeyPair();

        const account = await AccountBuilder
            .account()
            .withParticipants([user])
            .withBalance(asset,100)
            .build();

        await account.xcTransfer(
            destinationChainId,
            destinationAccountId,
            asset.id,
            10,
            [user],
            gtx
        );

        const accountBalance = await AssetBalance.getByAccountAndAssetId(account.id_, asset.id);
        const chainBalance = await AssetBalance.getByAccountAndAssetId(
            blockchainAccountId(destinationChainId),
            asset.id
        );

        expect(accountBalance.amount).toEqual(90);
        expect(chainBalance.amount).toEqual(10);
    });
});