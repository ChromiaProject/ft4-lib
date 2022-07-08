/* eslint-disable @typescript-eslint/no-unused-vars */ // this fixes all lines like 82, but might hide useful errors. Better, uglier solution found on line 115
import BlockchainUtil from "./util/blockchain-util";
import AccountBuilder from "./util/account-builder";
import { Account } from "../client/lib/ft3/user/account";
import TestUser from "./util/test-user";
import Blockchain from "../client/lib/ft3/core/blockchain/blockchain";
import {
  BlockchainInfo,
  RateLimitInfo,
  addAuthDescriptor,
} from "../client/lib/ft3";
import RateLimit from "../client/lib/ft3/user/rate-limit";

jest.setTimeout(2000000);

let blockchain: Blockchain = null;

const REQUEST_MAX_COUNT = 10;
const RECOVERY_TIME = 5000;
const POINTS_AT_ACCOUNT_CREATION = 1;

describe("Rate Limit", () => {
  beforeAll(async () => {
    blockchain = await BlockchainUtil.getDefaultBlockchain();
  });

  describe("Blockchain request configuaration in run.xml", () => {
    it("Should have a limit of 10 requests per minute", async () => {
      const info = await BlockchainInfo.getInfo(blockchain.connection);
      expect(info.rateLimitInfo.maxPoints).toEqual(REQUEST_MAX_COUNT);
    });

    it("should have 10 max requests and 5000 milliseconds recovery time", async () => {
      const info = await BlockchainInfo.getInfo(blockchain.connection);
      expect(info).toEqual(
        new BlockchainInfo(
          expect.any(String),
          expect.any(String),
          expect.any(String),
          new RateLimitInfo(expect.any(Boolean), 10, 5000, 1)
        )
      );
    });

    it("Should have a recovery period of 5 seconds", async () => {
      const info = await BlockchainInfo.getInfo(blockchain.connection);
      expect(info.rateLimitInfo.recoveryTime).toEqual(RECOVERY_TIME);
    });
  });

  describe("Test the account rate limit", () => {
    it("should show 10 at request count", async () => {
      const user = TestUser.singleSig();
      const account = await AccountBuilder.account(blockchain, user)
        .withParticipants([user.signatureProvider])
        .build();

      await account.sync();
      expect(account.rateLimit.points).toBe(POINTS_AT_ACCOUNT_CREATION);
    });

    it("waits 20 seconds and gets 4 points", async () => {
      const user = TestUser.singleSig();
      const account = await AccountBuilder.account(blockchain, user)
        .withParticipants([user.signatureProvider])
        .build();

      await timeout(20000);

      await RateLimit.execFreeOperation(account.id_, blockchain); // used to make one block
      await RateLimit.execFreeOperation(account.id_, blockchain); // used to calculate the last block's timestamp (previous block).
      // check the balance
      await account.sync();
      expect(account.rateLimit.points).toBe(4 + POINTS_AT_ACCOUNT_CREATION); // 20 seconds / 5s recovery time + 1 point given by default
    });

    it("can make 4 operations", async () => {
      const user = TestUser.singleSig();
      const account = await AccountBuilder.account(blockchain, user)
        .withParticipants([user.signatureProvider])
        .withPoints(4)
        .build();

      await expect(
        makeRequests(account, 4 + POINTS_AT_ACCOUNT_CREATION)
      ).resolves.toBeUndefined();
      await account.sync();
      expect(account.rateLimit.points).toBe(0);
    });

    it("can't make another operation because she has 0 points", async () => {
      const user = TestUser.singleSig();
      const account = await AccountBuilder.account(blockchain, user)
        .withParticipants([user.signatureProvider])
        .withPoints(4)
        .build();

      await expect(
        makeRequests(account, 4 + POINTS_AT_ACCOUNT_CREATION)
      ).resolves.toBeUndefined();
      await account.sync();

      await expect(makeRequests(account, 8)).rejects.toBeInstanceOf(Error);
    });
  });

  describe("test the client side point calculation", () => {
    const lastOperation = 10000;
    let timestamp = lastOperation;

    it("initializes with 0 points", async () => {
      const spy = jest.spyOn(RateLimit, "getLastTimestamp").mockImplementation(
        (blockchain) =>
          new Promise((res, _) =>
            res(timestamp)
          ) /*to be applied to 131, 147, 163*/ // eslint-disable-line @typescript-eslint/no-unused-vars
      );
      const expect0Points = await RateLimit.getPointsAvailable(
        0,
        lastOperation,
        blockchain
      );
      expect(expect0Points).toBe(0);
      spy.mockRestore();
    });

    it("gets 2 points after 10 seconds", async () => {
      timestamp += 10000;
      const spy = jest
        .spyOn(RateLimit, "getLastTimestamp")
        .mockImplementation(
          (blockchain) => new Promise((res, _) => res(timestamp))
        );
      const expect2Points = await RateLimit.getPointsAvailable(
        0,
        lastOperation,
        blockchain
      );
      expect(expect2Points).toBe(2);
      spy.mockRestore();
    });

    it("gets maximum 10 points", async () => {
      timestamp = lastOperation + 10 * 5 * 1000; // ten times the recovery period
      const spy = jest
        .spyOn(RateLimit, "getLastTimestamp")
        .mockImplementation(
          (blockchain) => new Promise((res, _) => res(timestamp))
        );
      const expectMax10Points = await RateLimit.getPointsAvailable(
        5,
        lastOperation,
        blockchain
      );
      expect(expectMax10Points).toBe(10);
      spy.mockRestore();
    });

    it("doesn't into negative number", async () => {
      timestamp = 0; // ten times the recovery period
      const spy = jest
        .spyOn(RateLimit, "getLastTimestamp")
        .mockImplementation(
          (blockchain) => new Promise((res, _) => res(timestamp))
        );
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
    account: Account,
    requests: number
  ): Promise<any> => {
    let txBuilder = blockchain.transactionBuilder();
    const users = [];
    for (let i = 0; i < requests; i++) {
      const user = TestUser.singleSig();
      users.push(user);
      txBuilder = txBuilder.add(
        addAuthDescriptor(
          account.session.user.authDescriptor.id,
          account.session.user.authDescriptor.id,
          user.authDescriptor
        )
      );
    }
    const allUsers = [...users, account.session.user];
    const tx = txBuilder.build(
      allUsers.map((user) => user.signatureProvider.pubKey)
    );
    allUsers.forEach(async (user) => await tx.sign(user.signatureProvider));

    return tx.post();
  };
});
