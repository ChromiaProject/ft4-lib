import { addAuthDescriptorOp } from "../client/lib/ft3/account/account-operations";
import { getAuthDescriptorId } from "../client/lib/ft3/account/auth-descriptor";
import { User } from "../client/lib/ft3/account/types";
import { ftUserSession } from "../client/lib/ft3/interfaces";
import AccountBuilder from "./util/account-builder";
import { getUserSession } from "./util/blockchain-util";
import TestUser from "./util/test-user";

jest.setTimeout(2000000);

let _ft: ftUserSession;

const REQUEST_MAX_COUNT = 10;
const RECOVERY_TIME = 5000;
const POINTS_AT_ACCOUNT_CREATION = 1;

describe("Rate Limit", () => {
  beforeAll(async () => {
    _ft = await getUserSession();
  });

  describe("Blockchain request configuration in run.xml", () => {
    it("should have 10 max requests and 5000 milliseconds recovery time", async () => {
      const info = await _ft.get.chainInfo();
      expect(info).toEqual({
        name: expect.any(String),
        website: expect.any(String),
        description: expect.any(String),
        rate_limit_active: 1,
        rate_limit_max_points: REQUEST_MAX_COUNT,
        rate_limit_recovery_time: RECOVERY_TIME,
        rate_limit_points_at_account_creation: POINTS_AT_ACCOUNT_CREATION,
      });
    });
  });

  describe("Test the account rate limit", () => {
    it("should show 10 at request count", async () => {
      const user = TestUser();
      const ft = _ft.changeUser(user);
      const account = await AccountBuilder.account(ft)
        .withParticipants([user.signatureProvider])
        .build();

      const rateLimit = await ft.get.account.rateLimit(account.id);
      expect(rateLimit.points).toBe(POINTS_AT_ACCOUNT_CREATION);
    });

    it("waits 20 seconds and gets 4 points", async () => {
      const user = TestUser();
      const ft = _ft.changeUser(user);
      const account = await AccountBuilder.account(ft)
        .withParticipants([user.signatureProvider])
        .build();

      await timeout(20000);

      await ft.account.dev.freeOperation(account.id); // used to make one block
      await ft.account.dev.freeOperation(account.id); // used to calculate the last block's timestamp (previous block).
      // check the balance
      const rateLimit = await ft.get.account.rateLimit(account.id);
      expect(rateLimit.points).toBe(4 + POINTS_AT_ACCOUNT_CREATION); // 20 seconds / 5s recovery time + points given by default
    });

    it("can make 4 operations", async () => {
      const user = TestUser();
      const ft = _ft.changeUser(user);
      const account = await AccountBuilder.account(ft)
        .withParticipants([user.signatureProvider])
        .withPoints(4)
        .build();

      await expect(
        makeRequests(ft, 4 + POINTS_AT_ACCOUNT_CREATION)
      ).resolves.toBeNull();
      const rateLimit = await ft.get.account.rateLimit(account.id);
      expect(rateLimit.points).toBe(0);
    });

    it("can't make another operation because she has 0 points", async () => {
      const user = TestUser();
      const ft = _ft.changeUser(user);
      await AccountBuilder.account(ft)
        .withParticipants([user.signatureProvider])
        .withPoints(4)
        .build();
      await expect(
        makeRequests(ft, 4 + POINTS_AT_ACCOUNT_CREATION)
      ).resolves.toBeNull();

      await expect(makeRequests(ft, 8)).rejects.toBeInstanceOf(Error);
    });
  });

  /* removed
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
  */

  const timeout = async (timer: number) => {
    return new Promise((res) => {
      setTimeout(res, timer);
    });
  };

  const makeRequests = async (
    ft: ftUserSession,
    requests: number
  ): Promise<any> => {
    const users: User[] = [];
    for (let i = 0; i < requests; i++) {
      users.push(TestUser());
    }
    const tx = ft.get.gtxClient.newTransaction([
      ft.user.signatureProvider.pubKey,
      ...users.map((user) => user.signatureProvider.pubKey),
    ]);
    users.forEach((user) => {
      tx.addOperation(
        ...addAuthDescriptorOp(
          getAuthDescriptorId(ft.user.authDescriptor),
          getAuthDescriptorId(ft.user.authDescriptor),
          user.authDescriptor
        )
      );
    });
    await Promise.all(
      [ft.user, ...users].map((user) => tx.sign(user.signatureProvider))
    );

    return tx.postAndWaitConfirmation();
  };
});
