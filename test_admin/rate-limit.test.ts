
import BlockchainUtil from "./util/blockchain-util";
import AccountBuilder from "./util/account-builder";
import { Account } from "../client/lib/ft3/user/account";
import TestUser from "./util/test-user";
import Blockchain from "../client/lib/ft3/core/blockchain/blockchain";
import ConnectionClient from "../client/lib/ft3/core/connection-client";
import { BlockchainInfo, RateLimitInfo, addAuthDescriptor } from "../client/lib/ft3";
import TestConnection from "./util/test-connection";
import { TestnetRateLimit as RateLimit} from "./testnetAdmin/testnet-rate-limit";

jest.setTimeout(2000000);

let blockchain: Blockchain = null;
const connection: ConnectionClient = TestConnection.connection()

const REQUEST_MAX_COUNT = 20;
const RECOVERY_TIME = 60000;
const POINTS_AT_ACCOUNT_CREATION = 1;

describe("Rate Limit", () => {
    beforeAll(async () => {
        blockchain = await BlockchainUtil.getDefaultBlockchain();

    });

  

    describe("Blockchain request configuaration in run.xml", () => {
        it("Should have a limit of 10 requests per minute", async () => {
            const info = await BlockchainInfo.getInfo(connection);
            expect(info.rateLimitInfo.maxPoints).toEqual(REQUEST_MAX_COUNT);
        });

        it("should have 10 max requests and 5000 milliseconds recovery time", async () => {
            const info = await BlockchainInfo.getInfo(connection);
            expect(info).toEqual(new BlockchainInfo(expect.any(String), expect.any(String), expect.any(String), new RateLimitInfo(true, REQUEST_MAX_COUNT, RECOVERY_TIME, POINTS_AT_ACCOUNT_CREATION)));
        });

        it("Should have a recovery period of 5 seconds", async () => {
            const info = await BlockchainInfo.getInfo(connection);
            expect(info.rateLimitInfo.recoveryTime).toEqual(RECOVERY_TIME);
        });
    });

    describe("Test the account rate limit", () => {
        it("should show 10 at request count", async () => {
            const user = TestUser.singleSig();
            const account = await AccountBuilder
                .account(blockchain, user)
                .withParticipants([user.keyPair])
                .build();
    
            await account.sync();
            expect(account.rateLimit.points).toBe(POINTS_AT_ACCOUNT_CREATION);
        });
    
        it("waits 20 seconds and gets 4 points", async () => {
            const user = TestUser.singleSig();
            const account = await AccountBuilder
                .account(blockchain, user)
                .withParticipants([user.keyPair])
                .build();

            await timeout(20000);
            
            await RateLimit.execFreeOperation(account.id_, blockchain); // used to make one block
            await RateLimit.execFreeOperation(account.id_, blockchain); // used to calculate the last block's timestamp (previous block).
            // check the balance
            await account.sync();
            expect(account.rateLimit.points).toBe(4 + POINTS_AT_ACCOUNT_CREATION); // 20 seconds / 5s recovery time
        });

        it.skip("can make 4 operations", async () => {
            const user = TestUser.singleSig();
            const account = await AccountBuilder
                .account(blockchain, user)
                .withParticipants([user.keyPair])
                .withPoints(2 - POINTS_AT_ACCOUNT_CREATION)
                .build();

            await expect(makeRequests(account, 4)).resolves.toBeUndefined();
            await account.sync();
            expect(account.rateLimit.points).toBe(0);
        });

        it.skip("can't make another operation because she has 0 points", async () => {
            const user = TestUser.singleSig();
            const account = await AccountBuilder
                .account(blockchain, user)
                .withParticipants([user.keyPair])
                .withPoints(2 - POINTS_AT_ACCOUNT_CREATION)
                .build();
            
            await expect(makeRequests(account, 4)).resolves.toBeUndefined();
            await account.sync();

            await expect(makeRequests(account, 8)).rejects.toBeInstanceOf(Error);
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
            timestamp = lastOperation + 10 * RECOVERY_TIME; // ten times the recovery period
            const spy = jest.spyOn(RateLimit, 'getLastTimestamp').mockImplementation((blockchain) => new Promise((res, _) => res(timestamp)));
            const expectMax10Points = await RateLimit.getPointsAvailable(5, lastOperation, blockchain);
            expect(expectMax10Points).toBe(10);
            spy.mockRestore();
        });

        it("doesn't into negative number", async () => {
            timestamp = 0; // 0 times the recovery period
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

    const makeRequests = async (account: Account, requests: number): Promise<any> => {
        
        let txBuilder = blockchain.transactionBuilder()
        for(let i = 0; i<requests; i++) {
            const disposableKeypair = TestUser.singleSig();
            txBuilder = txBuilder.add(addAuthDescriptor(account.session.user.authDescriptor.id, account.session.user.authDescriptor.id, disposableKeypair.authDescriptor))
        }
        return txBuilder.build(account.session.user.authDescriptor.signers)
            .sign(account.session.user.keyPair)
            .post()
    }
});
