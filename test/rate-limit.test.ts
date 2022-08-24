import BlockchainUtil from "./util/blockchain-util";
import AccountBuilder from "./util/account-builder";
import MutableAccount from "../client/lib/ft3/user/mutable-account";
import TestUser from "./util/test-user";
import User from "../client/lib/ft3/user/user";
import Blockchain from "../client/lib/ft3/core/blockchain/blockchain";
import {
  BlockchainInfo,
  RateLimitInfo,
  addAuthDescriptor,
} from "../client/lib/ft3";
import RateLimit from "../client/lib/ft3/user/rate-limit";

jest.setTimeout(2000000);

let blockchain: Blockchain;

const REQUEST_MAX_COUNT = 10;
const RECOVERY_TIME = 5000;
const POINTS_AT_ACCOUNT_CREATION = 1;

describe("Rate Limit", () => {
  beforeAll(async () => {
    blockchain = await BlockchainUtil.getDefaultBlockchain();
  });

  describe("Blockchain request configuration in run.xml", () => {
    it("should have 10 max requests and 5000 milliseconds recovery time", async () => {
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

      await RateLimit.execFreeOperation(account.id, blockchain); // used to make one block
      await RateLimit.execFreeOperation(account.id, blockchain); // used to calculate the last block's timestamp (previous block).
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
      timestamp += 10000;
      const spy = jest
        .spyOn(RateLimit, "getLastTimestamp")
        .mockImplementation(() => new Promise((res) => res(timestamp)));
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
        .mockImplementation(() => new Promise((res) => res(timestamp)));
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
    const users: User[] = [];
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
    await Promise.all(allUsers.map((user) => tx.sign(user.signatureProvider)));

    return tx.post();
  };
});
