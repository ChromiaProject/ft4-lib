import AccountBuilder from "./util/account-builder";
import {TestnetAssetBalance as AssetBalance} from "./testnetAdmin/testnet-asset-balance";
import { TestnetAsset as Asset} from "./testnetAdmin/testnet-asset";
import { generateAssetName, generateId } from "./util/util";
import BlockchainUtil from "./util/blockchain-util";
import Blockchain from "../client/lib/ft3/blockchain";

let blockchain: Blockchain = null;
let asset1: Asset = null;
let asset2: Asset = null;

describe('Asset balance', () => {
    beforeAll(async () => {
        blockchain = await BlockchainUtil.getDefaultBlockchain();
        asset1 = await Asset.register(generateAssetName(), generateId(), blockchain);
        asset2 = await Asset.register(generateAssetName(), generateId(), blockchain);
    });

    it('should be returned when queried by account id', async () => {
        const account = await AccountBuilder
            .account(blockchain)
            .build();

        await AssetBalance.giveBalance(account.id_, asset1.id, 10, blockchain);
        await AssetBalance.giveBalance(account.id_, asset2.id, 20, blockchain);

        const assets = await AssetBalance.getByAccountId(account.id_, blockchain);

        expect(assets.length).toEqual(2);
    });
});