import KeyPair from "../client/lib/cyptoUtils/keyPair"
import { generateAssetName, generateId } from "./util/util";
import Asset from "../client/lib/ft3/asset";
import { gtx } from '../client/blockchain';
import AssetBalance from "../client/lib/ft3/asset-balance";
import AccountBuilder from "./util/account-builder";
import {FlagsType} from "../client/lib/ft3/account";

let asset = null;

describe("Transfer", () => {
    beforeAll(async () => {
        asset = await Asset.register(generateAssetName(), generateId());
    });

    it("should succeed when balance is higher than amount to transfer", async () => {
        const user1 = new KeyPair();

        const account1 = await AccountBuilder
            .account()
            .withParticipants([user1])
            .withBalance(asset,200)
            .build();

        const account2 = await AccountBuilder
            .account()
            .build();

        await account1.transfer(account2.id_, asset.id, 10, [user1], gtx);

        const assetBalance1 = await AssetBalance.getByAccountAndAssetId(account1.id_, asset.id);
        const assetBalance2 = await AssetBalance.getByAccountAndAssetId(account2.id_, asset.id);

        expect(assetBalance1.amount).toEqual(190);
        expect(assetBalance2.amount).toEqual(10);
    });

    it("should fail when balance is lower than amount to transfer", async () => {
        const user1 = new KeyPair();

        const account1 = await AccountBuilder
            .account()
            .withParticipants([user1])
            .withBalance(asset,5)
            .build();

        const account2 = await AccountBuilder
            .account()
            .build();

        const promise = account1.transfer(account2.id_, asset.id, 10, [user1], gtx);
        await expect(promise).rejects.toBeInstanceOf(Error);
    }, 10000);

    it("should fail if auth descriptor doesn't have transfer rights", async () => {
        const user1 = new KeyPair();

        const account1 = await AccountBuilder
            .account()
            .withAuthFlags([FlagsType.Account])
            .withParticipants([user1])
            .withBalance(asset,200)
            .build();

        const account2 = await AccountBuilder
            .account()
            .build();

        const promise = account1.transfer(account2.id_, asset.id, 10, [user1], gtx);
        await expect(promise).rejects.toBeInstanceOf(Error);
    });

    it("should succeed if transferring tokens to a multisig account", async () => {
        const user1 = new KeyPair();

        const account1 = await AccountBuilder
            .account()
            .withParticipants([user1])
            .withBalance(asset,200)
            .build();

        const account2 = await AccountBuilder
            .account()
            .withParticipants([new KeyPair(), new KeyPair()])
            .withRequiredSignatures(2)
            .build();

        await account1.transfer(account2.id_, asset.id, 10, [user1], gtx);

        const assetBalance1 = await AssetBalance.getByAccountAndAssetId(account1.id_, asset.id);
        const assetBalance2 = await AssetBalance.getByAccountAndAssetId(account2.id_, asset.id);

        expect(assetBalance1.amount).toEqual(190);
        expect(assetBalance2.amount).toEqual(10);
    });

    it("should succeed burning tokens", async () => {
        const user1 = new KeyPair();

        const account = await AccountBuilder
            .account()
            .withParticipants([user1])
            .withBalance(asset,200)
            .build();

        await account.burnTokens(asset.id, 10, [user1], gtx);

        const assetBalance = account.getAssetById(asset.id);

        expect(assetBalance.amount).toEqual(190);
    });

    it("should have one payment history entry if one transfer made", async () => {
        const user1 = new KeyPair();

        const account1 = await AccountBuilder
            .account()
            .withParticipants([user1])
            .withBalance(asset,200)
            .build();

        const account2 = await AccountBuilder
            .account()
            .build();

        await account1.transfer(account2.id_, asset.id, 10, [user1], gtx);
        const paymentHistory = await account1.getPaymentHistory(gtx);

        expect(paymentHistory.length).toEqual(1);
    });

    it("should have two payment history entries if two transfers made", async () => {
        const user1 = new KeyPair();

        const account1 = await AccountBuilder
            .account()
            .withParticipants([user1])
            .withBalance(asset,200)
            .build();

        const account2 = await AccountBuilder
            .account()
            .build();

        await account1.transfer(account2.id_, asset.id, 10, [user1], gtx);
        await account1.transfer(account2.id_, asset.id, 11, [user1], gtx);
        const paymentHistory = await account1.getPaymentHistory(gtx);

        expect(paymentHistory.length).toEqual(2);
    }, 10000);
});