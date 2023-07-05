import { User } from "../client/lib/ft4/accounts/types";
import { createConnection } from "../client/lib/ft4/ft-session";
import { Connection, ftUserSession } from "../client/lib/ft4/types";
import AccountBuilder from "./util/account-builder";
import adminUser from "./util/admin_user";
import { createChromiaClient, getUserSession } from "./util/blockchain-util";
import TestUser from "./util/test-user";
import { _op } from "/ft4/utils";

jest.setTimeout(2000000);

let _ft: ftUserSession;
let _connection: Connection;

const REQUEST_MAX_COUNT = 10;
const RECOVERY_TIME = 5000;
const POINTS_AT_ACCOUNT_CREATION = 1;

describe.skip("Rate Limit", () => {
  beforeAll(async () => {
    _ft = await getUserSession();
    _connection = createConnection(await createChromiaClient());
  });

  describe("Blockchain request configuration in run.xml", () => {
    it("should have 10 max requests and 5000 milliseconds recovery time", async () => {
      const info = await _connection.getConfig();
      expect(info).toEqual({
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

      const foundAccount = await _connection.getAccountById(account.id);
      const rateLimit = await foundAccount!.getRateLimit();
      expect(rateLimit.points).toBe(POINTS_AT_ACCOUNT_CREATION);
    });

    it("waits 20 seconds and gets 4 points", async () => {
      const user = TestUser();
      const ft = _ft.changeUser(user);
      const account = await AccountBuilder.account(ft)
        .withParticipants([user.signatureProvider])
        .build();

      await timeout(20000);

      await ft.account.admin.givePoints(adminUser(), account.id, 1); // used to make one block
      await ft.account.admin.givePoints(adminUser(), account.id, 1); // used to calculate the last block's timestamp (previous block).
      // check the balance
      const foundAccount = await _connection.getAccountById(account.id);
      const rateLimit = await foundAccount!.getRateLimit();
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
      const foundAccount = await _connection.getAccountById(account.id);
      const rateLimit = await foundAccount!.getRateLimit();
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

    const operations = users.map(() =>
      _op("ft.ft_auth", ft.user.authDescriptor.id, ft.user.authDescriptor.id)
    );
    const signers = [
      ft.user.signatureProvider.pubKey,
      ...users.map((user) => user.signatureProvider.pubKey),
    ];
    let tx: Buffer = _connection.client.encodeTransaction({
      operations,
      signers,
    });
    for (const user of [ft.user, ...users]) {
      tx = await _connection.client.signTransaction(tx, user.signatureProvider);
    }

    return _connection.client.sendTransaction(tx);
  };
});
