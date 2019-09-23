import TestUser from "./util/test-user";
import AccountBuilder from "./util/account-builder";
import BlockchainUtil from "./util/blockchain-util";
import Asset from "../client/lib/ft3/asset";
import {generateAssetName, generateId} from "./util/util";
import Blockchain from "../client/lib/ft3/blockchain";

let blockchain: Blockchain = null;
let asset: Asset = null;

describe('Payment history', () => {
    beforeAll(async () => {
        blockchain = await BlockchainUtil.getDefaultBlockchain();
        asset = await Asset.register(generateAssetName(), generateId(), blockchain);
    });

    it("should have two payment history entries if two transfers made", async () => {
        const user = TestUser.singleSig();

        const account1 = await AccountBuilder
            .account(blockchain, user)
            .withParticipants([user.keyPair])
            .withBalance(asset, 200)
            .build();

        const account2 = await AccountBuilder
            .account(blockchain)
            .build();

        await account1.transfer(account2.id_, asset.id, 10);
        await account1.transfer(account2.id_, asset.id, 11);
        const paymentHistory = await account1.getPaymentHistory();

        await account1.getPaymentHistoryIterator(5);


        expect(paymentHistory.length).toEqual(2);
    })

});