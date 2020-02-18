import KeyPair from "../client/lib/cyptoUtils/keyPair"
import { generateAssetName, generateId } from "./util/util";
import { TestnetAsset as Asset} from "./testnetAdmin/testnet-asset";
import { TestnetAssetBalance as AssetBalance} from "./testnetAdmin/testnet-asset-balance";
import AccountBuilder from "./util/account-builder";
import { FlagsType } from "../client/lib/ft3/user/account";
import TestUser from "./util/test-user";
import BlockchainUtil from "./util/blockchain-util";
import Blockchain from "../client/lib/ft3/core/blockchain/blockchain";

let blockchain: Blockchain = null;
let asset: Asset = null;

describe("Transfer", () => {
    beforeAll(async () => {
        blockchain = await BlockchainUtil.getDefaultBlockchain();
        asset = await Asset.register(generateAssetName(), generateId(), blockchain);
    });

    it("should succeed when balance is higher than amount to transfer", async () => {
        const user = TestUser.singleSig();

        const account1 = await AccountBuilder
            .account(blockchain, user)
            .withParticipants([user.keyPair])
            .withBalance(asset,200)
            .withPoints(1)
            .build();

        const account2 = await AccountBuilder
            .account(blockchain)
            .build();

        await account1.transfer(account2.id_, asset.id, 10);

        const assetBalance1 = await AssetBalance.getByAccountAndAssetId(account1.id_, asset.id, blockchain);
        const assetBalance2 = await AssetBalance.getByAccountAndAssetId(account2.id_, asset.id, blockchain);

        expect(assetBalance1.amount).toEqual(190);
        expect(assetBalance2.amount).toEqual(10);
    });

    it("should fail when balance is lower than amount to transfer", async () => {
        const user = TestUser.singleSig();

        const account1 = await AccountBuilder
            .account(blockchain, user)
            .withParticipants([user.keyPair])
            .withBalance(asset,5)
            .withPoints(1)
            .build();

        const account2 = await AccountBuilder
            .account(blockchain)
            .build();

        const promise = account1.transfer(account2.id_, asset.id, 10);
        await expect(promise).rejects.toBeInstanceOf(Error);
    });

    it("should fail if auth descriptor doesn't have transfer rights", async () => {
        const user = TestUser.singleSig();

        const account1 = await AccountBuilder
            .account(blockchain, user)
            .withAuthFlags([FlagsType.Account])
            .withParticipants([user.keyPair])
            .withBalance(asset,200)
            .withPoints(1)
            .build();

        const account2 = await AccountBuilder
            .account(blockchain)
            .build();

        const promise = account1.transfer(account2.id_, asset.id, 10);
        await expect(promise).rejects.toBeInstanceOf(Error);
    });

    it("should succeed if transferring tokens to a multisig account", async () => {
        const user = TestUser.singleSig();

        const account1 = await AccountBuilder
            .account(blockchain, user)
            .withParticipants([user.keyPair])
            .withBalance(asset,200)
            .withPoints(1)
            .build();

        const account2 = await AccountBuilder
            .account(blockchain)
            .withParticipants([new KeyPair(), new KeyPair()])
            .withRequiredSignatures(2)
            .build();

        await account1.transfer(account2.id_, asset.id, 10);

        const assetBalance1 = await AssetBalance.getByAccountAndAssetId(account1.id_, asset.id, blockchain);
        const assetBalance2 = await AssetBalance.getByAccountAndAssetId(account2.id_, asset.id, blockchain);

        expect(assetBalance1.amount).toEqual(190);
        expect(assetBalance2.amount).toEqual(10);
    });

    it("should succeed burning tokens", async () => {
        const user = TestUser.singleSig();

        const account = await AccountBuilder
            .account(blockchain, user)
            .withParticipants([user.keyPair])
            .withBalance(asset,200)
            .withPoints(1)
            .build();

        await account.burnTokens(asset.id, 10);

        const assetBalance = account.getAssetById(asset.id);

        expect(assetBalance.amount).toEqual(190);
    });

    it("should have one payment history entry if one transfer made", async () => {
        const user = TestUser.singleSig();

        const account1 = await AccountBuilder
            .account(blockchain, user)
            .withParticipants([user.keyPair])
            .withBalance(asset,200)
            .withPoints(1)
            .build();

        const account2 = await AccountBuilder
            .account(blockchain)
            .build();

        await account1.transfer(account2.id_, asset.id, 10);
        const paymentHistory = await account1.getPaymentHistory();

        expect(paymentHistory.length).toEqual(1);
    });

    it("should have two payment history entries if two transfers made", async () => {
        const user = TestUser.singleSig();

        const account1 = await AccountBuilder
            .account(blockchain, user)
            .withParticipants([user.keyPair])
            .withBalance(asset,200)
            .withPoints(2)
            .build();

        const account2 = await AccountBuilder
            .account(blockchain)
            .build();

        await account1.transfer(account2.id_, asset.id, 10);
        await account1.transfer(account2.id_, asset.id, 11);
        const paymentHistory = await account1.getPaymentHistory();

        expect(paymentHistory.length).toEqual(2);
    });
});