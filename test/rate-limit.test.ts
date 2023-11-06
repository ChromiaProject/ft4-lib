import { IClient, Transaction } from "postchain-client";
import { createConnection } from "../client/lib/ft4/ft-session";
import { Connection } from "../client/lib/ft4/types";
import AccountBuilder from "./util/account-builder";
import { createChromiaClient } from "./util/blockchain-util";
import TestUser, { User } from "./util/test-user";
import { Config } from "/ft4/utils/types";
import { ftAuth } from "/ft4/authentication";
import { BufferId } from "/cryptoUtils";
import { op } from "/ft4";
import { deriveAccountId } from "/ft4/accounts";

jest.setTimeout(2000000);

let _connection: Connection;

const REQUEST_MAX_COUNT = 10;
const RECOVERY_TIME = 5000;
const POINTS_AT_ACCOUNT_CREATION = 2;

describe("Rate Limit", () => {
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
          account.id,
        ),
      ).resolves.toMatchObject({ status: "confirmed" });
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

      await makeRequests(
        _connection.client,
        4 + POINTS_AT_ACCOUNT_CREATION,
        user,
        account.id,
      );

      const tx = {
        operations: [
          ftAuth(account.id, deriveAccountId(user.authDescriptorRegistration)),
          op("test_authenticated_operation"),
          ftAuth(account.id, deriveAccountId(user.authDescriptorRegistration)),
          op("test_authenticated_operation"),
        ],
        signers: [user.signatureProvider.pubKey],
      };

      await expect(
        _connection.client.signAndSendUniqueTransaction(
          tx,
          user.signatureProvider,
        ),
      ).rejects.toBeInstanceOf(Error);
    });
  });

  const makeRequests = async (
    client: IClient,
    requests: number,
    user: User,
    accountId: BufferId,
  ): Promise<any> => {
    const tx: Transaction = {
      operations: Array(requests).fill(
        op("consume_point", accountId),
        0,
        requests,
      ),
      signers: [user.signatureProvider.pubKey],
    };

    return client.signAndSendUniqueTransaction(tx, user.signatureProvider);
  };
});
