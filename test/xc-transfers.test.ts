import AccountBuilder from "./util/account-builder";
import {blockchainAccountId, generateAssetName, generateId} from "./util/util";
import Asset from "../client/lib/ft3/asset";
import AssetBalance from "../client/lib/ft3/asset-balance";
import TestUser from "./util/test-user";
import BlockchainUtil from "./util/blockchain-util";
import Blockchain from "../client/lib/ft3/blockchain";

let blockchain: Blockchain = null;
let asset: Asset = null;

describe("Cross-chain transfer", () => {
    beforeAll(async () => {
        blockchain = await BlockchainUtil.getDefaultBlockchain();
        asset = await Asset.register(generateAssetName(), generateId(), blockchain);
    });

    it("should succeessfully initialize when there's enough balance on the account", async () => {
        const destinationChainId = generateId();
        const destinationAccountId = generateId();
        const user = TestUser.singleSig();

        const account = await AccountBuilder
            .account(blockchain, user)
            .withParticipants([user.keyPair])
            .withBalance(asset, 100)
            .withPoints(1)
            .build();

        await account.xcTransfer(destinationChainId, destinationAccountId, asset.id, 10);

        const accountBalance = await AssetBalance.getByAccountAndAssetId(account.id_, asset.id, blockchain);
        const chainBalance = await AssetBalance.getByAccountAndAssetId(
            blockchainAccountId(destinationChainId),
            asset.id,
            blockchain
        );

        expect(accountBalance.amount).toEqual(90);
        expect(chainBalance.amount).toEqual(10);
    });
});