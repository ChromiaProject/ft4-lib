import { IClient, Transaction } from "postchain-client";
import { createConnection } from "../client/lib/ft4/ft-session";
import { Connection } from "../client/lib/ft4/types";
import AccountBuilder from "./util/account-builder";
import adminUser from "./util/admin_user";
import { createChromiaClient } from "./util/blockchain-util";
import TestUser, { User } from "./util/test-user";
import { addRateLimitPoints } from "/ft4/admin/admin-op-functions";
import { Config } from "/ft4/utils/types";
import { ftAuth } from "/ft4/authentication";
import { BufferId } from "/cryptoUtils";

jest.setTimeout(2000000);

let _connection: Connection;

const REQUEST_MAX_COUNT = 10;
const RECOVERY_TIME = 5000;
const POINTS_AT_ACCOUNT_CREATION = 2;

describe.skip("Rate Limit", () => {
  beforeAll(async () => {
    _connection = createConnection(await createChromiaClient());
  });

  describe("Blockchain request configuration in config.yaml", () => {
    it("should have 10 max requests and 5000 milliseconds recovery time", async () => {
      const info = await _connection.getConfig();
      expect(info).toEqual(<Config>{
        rateLimit: {
          active: 1,
          maxPoints: REQUEST_MAX_COUNT,
          recoveryTime: RECOVERY_TIME,
          pointsAtAccountCreation: POINTS_AT_ACCOUNT_CREATION,
        },
      });
    });
  });

  describe("Test the account rate limit", () => {
    it("should show 10 at request count", async () => {
      const user = TestUser();

      const account = await AccountBuilder.account(_connection)
        .withParticipant(user.signatureProvider)
        .build();

      const foundAccount = await _connection.getAccountById(account.id);
      const rateLimit = await foundAccount!.getRateLimit();
      expect(rateLimit.points).toBe(POINTS_AT_ACCOUNT_CREATION);
    });

    it("waits 20 seconds and gets 4 points", async () => {
      const user = TestUser();

      const account = await AccountBuilder.account(_connection)
        .withParticipant(user.signatureProvider)
        .build();

      await timeout(20000);

      await addRateLimitPoints(
        _connection.client,
        adminUser().signatureProvider,
        account.id,
        1
      ); // used to make one block
      await addRateLimitPoints(
        _connection.client,
        adminUser().signatureProvider,
        account.id,
        1
      ); // used to calculate the last block's timestamp (previous block).
      // check the balance
      const foundAccount = await _connection.getAccountById(account.id);
      const rateLimit = await foundAccount!.getRateLimit();
      expect(rateLimit.points).toBe(4 + POINTS_AT_ACCOUNT_CREATION); // 20 seconds / 5s recovery time + points given by default
    });

    it("can make 4 operations", async () => {
      const user = TestUser();

      const account = await AccountBuilder.account(_connection)
        .withParticipant(user.signatureProvider)
        .withPoints(4)
        .build();

      await expect(
        makeRequests(
          _connection.client,
          4 + POINTS_AT_ACCOUNT_CREATION,
          user,
          account.id
        )
      ).resolves.toBeNull();
      const foundAccount = await _connection.getAccountById(account.id);
      const rateLimit = await foundAccount!.getRateLimit();
      expect(rateLimit.points).toBe(0);
    });

    it("can't make another operation because she has 0 points", async () => {
      const user = TestUser();

      const account = await AccountBuilder.account(_connection)
        .withParticipant(user.signatureProvider)
        .withPoints(4)
        .build();
      await expect(
        makeRequests(
          _connection.client,
          4 + POINTS_AT_ACCOUNT_CREATION,
          user,
          account.id
        )
      ).resolves.toBeNull();

      await expect(
        makeRequests(_connection.client, 8, user, account.id)
      ).rejects.toBeInstanceOf(Error);
    });
  });

  const timeout = async (timer: number) => {
    return new Promise((res) => {
      setTimeout(res, timer);
    });
  };

  const makeRequests = async (
    client: IClient,
    requests: number,
    user: User,
    accountId: BufferId
  ): Promise<any> => {
    const tx: Transaction = {
      operations: [].fill(
        ftAuth(accountId, user.authDescriptor.id),
        0,
        requests
      ),
      signers: [user.signatureProvider.pubKey],
    };

    return client.signAndSendUniqueTransaction(tx, user.signatureProvider);

    // const users: User[] = [];
    // for (let i = 0; i < requests; i++) {
    //   users.push(TestUser());
    // }

    // const operations = users.map(() =>
    //   ftAuth(ft.user.authDescriptor.id, ft.user.authDescriptor.id)
    // );
    // const signers = [
    //   ft.user.signatureProvider.pubKey,
    //   ...users.map((user) => user.signatureProvider.pubKey),
    // ];
    // let tx: Buffer = _connection.client.encodeTransaction({
    //   operations,
    //   signers,
    // });
    // for (const user of [ft.user, ...users]) {
    //   tx = await _connection.client.signTransaction(tx, user.signatureProvider);
    // }

    // return _connection.client.sendTransaction(tx);
  };
});
