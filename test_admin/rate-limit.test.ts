import BlockchainUtil from "./util/blockchain-util";
import AccountBuilder from "./util/account-builder";
import MutableAccount from "../client/lib/ft3/user/mutable-account";
import TestUser from "./util/test-user";
import Blockchain from "../client/lib/ft3/core/blockchain/blockchain";
import {
  BlockchainInfo,
  RateLimitInfo,
  addAuthDescriptor,
} from "../client/lib/ft3";
import { TestnetRateLimit as RateLimit } from "./testnetAdmin/testnet-rate-limit";

jest.setTimeout(2000000);

let blockchain: Blockchain = null;

const REQUEST_MAX_COUNT = 20;
const RECOVERY_TIME = 60000;
const POINTS_AT_ACCOUNT_CREATION = 1;

describe("Rate Limit", () => {
  beforeAll(async () => {
    blockchain = await BlockchainUtil.getDefaultBlockchain();
  });

  describe("Blockchain request configuaration in run.xml", () => {
    it("Should have a limit of 20 requests per minute", async () => {
      const info = await BlockchainInfo.getInfo(blockchain.connection);
      expect(info.rateLimitInfo.maxPoints).toEqual(REQUEST_MAX_COUNT);
    });

    it("should have 20 max requests and 60000 milliseconds recovery time", async () => {
      const info = await BlockchainInfo.getInfo(blockchain.connection);
      expect(info).toEqual(
        new BlockchainInfo(
          expect.any(String),
          expect.any(String),
          expect.any(String),
          new RateLimitInfo(
            true,
            REQUEST_MAX_COUNT,
            RECOVERY_TIME,
            POINTS_AT_ACCOUNT_CREATION
          )
        )
      );
    });

    it("Should have a recovery period of 60 seconds", async () => {
      const info = await BlockchainInfo.getInfo(blockchain.connection);
      expect(info.rateLimitInfo.recoveryTime).toEqual(RECOVERY_TIME);
    });
  });

  describe("Test the account rate limit", () => {
    it("should show 10 at request count", async () => {
      const user = TestUser.singleSig();
      const account = await AccountBuilder.account(blockchain, user)
        .withParticipants([user.keyPair])
        .build();

      await account.sync();
      expect(account.rateLimit.points).toBe(POINTS_AT_ACCOUNT_CREATION);
    });

    it("waits 120 seconds and gets 2 points", async () => {
      const user = TestUser.singleSig();
      const account = await AccountBuilder.account(blockchain, user)
        .withParticipants([user.keyPair])
        .build();

      await timeout(120000);

      await RateLimit.execFreeOperation(account.id, blockchain); // used to make one block
      await RateLimit.execFreeOperation(account.id, blockchain); // used to calculate the last block's timestamp (previous block).
      // check the balance
      await account.sync();
      expect(account.rateLimit.points).toBe(2 + POINTS_AT_ACCOUNT_CREATION); // 120 seconds / 60s recovery time
    });

    it.skip("can make 4 operations", async () => {
      const user = TestUser.singleSig();
      const account = await AccountBuilder.account(blockchain, user)
        .withParticipants([user.keyPair])
        .withPoints(2 - POINTS_AT_ACCOUNT_CREATION)
        .build();

      await expect(makeRequests(account, 4)).resolves.toBeUndefined();
      await account.sync();
      expect(account.rateLimit.points).toBe(0);
    });

    it.skip("can't make another operation because she has 0 points", async () => {
      const user = TestUser.singleSig();
      const account = await AccountBuilder.account(blockchain, user)
        .withParticipants([user.keyPair])
        .withPoints(2 - POINTS_AT_ACCOUNT_CREATION)
        .build();

      await expect(makeRequests(account, 4)).resolves.toBeUndefined();
      await account.sync();

      await expect(makeRequests(account, 8)).rejects.toBeInstanceOf(Error);
    });
  });

  describe("test the client side point calculation", () => {
    const lastOperation = 10000;
    let timestamp = lastOperation;

    it("initializes with 0 points", async () => {
      const spy = jest
        .spyOn(RateLimit, "getLastTimestamp")
        .mockImplementation(() => new Promise((res) => res(timestamp)));
      const expect0Points = await RateLimit.getPointsAvailable(
        0,
        lastOperation,
        blockchain
      );
      expect(expect0Points).toBe(0);
      spy.mockRestore();
    });

    it("gets 2 points after 10 seconds", async () => {
      timestamp += 60000;
      const spy = jest
        .spyOn(RateLimit, "getLastTimestamp")
        .mockImplementation(() => new Promise((res) => res(timestamp)));
      const expect1Point = await RateLimit.getPointsAvailable(
        0,
        lastOperation,
        blockchain
      );
      expect(expect1Point).toBe(1);
      spy.mockRestore();
    });

    it("gets maximum 20 points", async () => {
      timestamp = lastOperation + REQUEST_MAX_COUNT * RECOVERY_TIME; // ten times the recovery period
      const spy = jest
        .spyOn(RateLimit, "getLastTimestamp")
        .mockImplementation(() => new Promise((res) => res(timestamp)));
      const expectMax10Points = await RateLimit.getPointsAvailable(
        5,
        lastOperation,
        blockchain
      );
      expect(expectMax10Points).toBe(REQUEST_MAX_COUNT);
      spy.mockRestore();
    });

    it("doesn't into negative number", async () => {
      timestamp = 0; // 0 times the recovery period
      const spy = jest
        .spyOn(RateLimit, "getLastTimestamp")
        .mockImplementation(() => new Promise((res) => res(timestamp)));
      const expectMax10Points = await RateLimit.getPointsAvailable(
        0,
        lastOperation,
        blockchain
      );
      expect(expectMax10Points).toBe(0);
      spy.mockRestore();
    });
  });

  const timeout = async (timer: number) => {
    return new Promise((res) => {
      setTimeout(res, timer);
    });
  };

  const makeRequests = async (
    account: MutableAccount,
    requests: number
  ): Promise<any> => {
    let txBuilder = blockchain.transactionBuilder();
    for (let i = 0; i < requests; i++) {
      const disposableKeypair = TestUser.singleSig();
      txBuilder = txBuilder.add(
        addAuthDescriptor(
          account.session.user.authDescriptor.id,
          account.session.user.authDescriptor.id,
          disposableKeypair.authDescriptor
        )
      );
    }
    return txBuilder
      .build(account.session.user.authDescriptor.signers)
      .sign(account.session.user.keyPair)
      .post();
  };
});
