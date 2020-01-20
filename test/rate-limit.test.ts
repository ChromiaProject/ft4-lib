
import Asset from "../client/lib/ft3/asset";
import BlockchainUtil from "./util/blockchain-util";
import AccountBuilder from "./util/account-builder";
import { FlagsType } from "../client/lib/ft3/account";
import TestUser from "./util/test-user";
import Blockchain from "../client/lib/ft3/blockchain";
import ConnectionClient from "../client/lib/ft3/connection-client";
import { generateAssetName, generateId } from "./util/util";
import { BlockchainInfo, User, nop } from "../client/lib/ft3";
import TestConnection from "./util/test-connection";
import Operation from "../client/lib/ft3/operation";
import RateLimit from "../client/lib/ft3/rate-limit";

jest.setTimeout(2000000);

let blockchain: Blockchain = null;
let user: User;
let account1;
let asset: Asset = null;
const connection: ConnectionClient = TestConnection.connection()

const REQUEST_MAX_COUNT = 10;
const RECOVERY_TIME = 5000;

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

    describe("Blockchain request configuaration in run.xml", () => {
        it("Should have a limit of 10 requests per minute", async () => {
            const info = await BlockchainInfo.getInfo(connection);
            expect(info.requestMaxCount).toEqual(REQUEST_MAX_COUNT);
        });

        it("Should have a recovery period of 5 seconds", async () => {
            const info = await BlockchainInfo.getInfo(connection);
            expect(info.requestRecoveryTime).toEqual(RECOVERY_TIME);
        });
    });

    describe("Test the account rate limit", () => {
        it("should show 10 at request count", async () => {
            // check how many requests are left
            await account1.sync();
            expect(account1.rateLimit.points).toBe(0);
        });
    
        it("waits 20 seconds and gets 4 points", async () => {
            await timeout(20000);
            console.log("GGG", account1.id_);
            await RateLimit.execFreeOperation(account1.id_, blockchain); // used to make one block

            // check the balance
            await RateLimit.execFreeOperation(account1.id_, blockchain); // used to make one block
            await account1.sync();
            expect(account1.rateLimit.points).toBe(4); // 20 seconds / 5s recovery time
        });

        it("can make 4 operations", async () => {
            await makeRequests(4);
            await account1.sync();
            expect(account1.rateLimit.points).toBe(0);
        });

        it("can't make another operation because she has 0 points", async () => {
            await RateLimit.execFreeOperation(account1.id_, blockchain); 
            await account1.sync();
            if(account1.rateLimit.points > 0) {
                await makeRequests(account1.rateLimit.points);
            }
            await expect(makeRequests(1)).rejects.toThrowError()
        })
    });

    describe("test the client side point calculation", () => {
        const lastOperation = 10000;
        let timestamp = lastOperation;
        

        it("initializes with 0 points", async () => {
            const spy = jest.spyOn(RateLimit, 'getLastTimestamp').mockImplementation((blockchain) => new Promise((res, _) => res(timestamp)));
            const expect0Points = await RateLimit.getPointsAvailable(0, lastOperation, blockchain);
            expect(expect0Points).toBe(0)
            spy.mockRestore();
        });

        it("gets 2 points after 10 seconds", async () => {
            timestamp += 10000;
            const spy = jest.spyOn(RateLimit, 'getLastTimestamp').mockImplementation((blockchain) => new Promise((res, _) => res(timestamp)));
            const expect2Points = await RateLimit.getPointsAvailable(0, lastOperation, blockchain);
            expect(expect2Points).toBe(2);
            spy.mockRestore();
        });

        it("gets maximum 10 points", async () => {
            timestamp = lastOperation + 10 * 5 * 1000; // ten times the recovery period
            const spy = jest.spyOn(RateLimit, 'getLastTimestamp').mockImplementation((blockchain) => new Promise((res, _) => res(timestamp)));
            const expectMax10Points = await RateLimit.getPointsAvailable(5, lastOperation, blockchain);
            expect(expectMax10Points).toBe(10);
            spy.mockRestore();
        });

        it("doesn't into negative number", async () => {
            timestamp = 0; // ten times the recovery period
            const spy = jest.spyOn(RateLimit, 'getLastTimestamp').mockImplementation((blockchain) => new Promise((res, _) => res(timestamp)));
            const expectMax10Points = await RateLimit.getPointsAvailable(0, lastOperation, blockchain);
            expect(expectMax10Points).toBe(0);
            spy.mockRestore();
        });
    });

    const timeout = async (timer: number) => {
        return new Promise((res, rej) => {
            setTimeout(res, timer);
        })
    }


    const makeRequests = async (requests: number) => {
        for(let i = 0; i<requests; i++ ){
            const disposableKeypair = TestUser.singleSig();
            await account1.addAuthDescriptor(disposableKeypair.authDescriptor);
        }
    }
});