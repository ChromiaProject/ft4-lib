
import Asset from "../client/lib/ft3/asset";
import BlockchainUtil from "./util/blockchain-util";
import AccountBuilder from "./util/account-builder";
import { FlagsType } from "../client/lib/ft3/account";
import TestUser from "./util/test-user";
import Blockchain from "../client/lib/ft3/blockchain";
import ConnectionClient from "../client/lib/ft3/connection-client";
import { generateAssetName, generateId } from "./util/util";
import { BlockchainInfo, User } from "../client/lib/ft3";
import TestConnection from "./util/test-connection";

jest.setTimeout(2000000)

let blockchain: Blockchain = null;
let user: User;
let account1;
let asset: Asset = null;
const connection: ConnectionClient = TestConnection.connection()

const REQUEST_PER_MINUTE = 60;

describe("Rate Limit", () => {
    beforeAll(async () => {
        blockchain = await BlockchainUtil.getDefaultBlockchain();

        asset = await Asset.register(generateAssetName(), generateId(), blockchain);
        
        user = TestUser.singleSig();

        account1 = await AccountBuilder
            .account(blockchain, user)
            .withParticipants([user.keyPair])
            .withBalance(asset, 200)
            .build();
    });

    it("Should have a limit of 60 requests per minute", async () => {
        const info = await BlockchainInfo.getInfo(connection);
        expect(info.requestsPerMinute).toEqual(REQUEST_PER_MINUTE);
    });
   
    it("should show 0 at request count", async () => {
        // check how many requests are left
        await account1.sync();
        expect(account1.rateLimit.requestCount).toBe(0);
    });

    it("should show 10 at requests count after 10 requests", async () => {
        for(let i = 0; i<10; i++ ){
            const disposableKeypair = TestUser.singleSig();
            await account1.addAuthDescriptor(disposableKeypair.authDescriptor);
        }
        await account1.sync();
        expect(account1.rateLimit.requestCount).toBe(10)
    });

    const fiftyRequests = async () => {
        for(let i = 0; i<50; i++ ){
            const disposableKeypair = TestUser.singleSig();
            await account1.addAuthDescriptor(disposableKeypair.authDescriptor);
        }
    }

    it("should allow 60 requests" , async () => {
        await fiftyRequests();

        await account1.sync();
        expect(account1.rateLimit.requestCount).toBe(60);
    });

    it("should not allow 61 requests", async () => {
        const disposableKeypair = TestUser.singleSig();
        const addDescriptor = account1.addAuthDescriptor(disposableKeypair.authDescriptor);
        await expect(addDescriptor).rejects.toBeInstanceOf(Error);
    });

});