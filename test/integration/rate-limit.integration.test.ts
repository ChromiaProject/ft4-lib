import {
  AccountBuilder,
  singleSigUser as TestUser,
  User,
  useChromiaNode,
} from "@ft4-test/util";
import { ftAuth } from "@ft4/authentication";
import { Connection, createConnection } from "@ft4/ft-session";
import { BufferId, op } from "@ft4/utils";
import { IClient, Transaction } from "postchain-client";

jest.setTimeout(2000000);

let _connection: Connection;

const POINTS_AT_ACCOUNT_CREATION = 2;

describe("Rate Limit", () => {
  const getClient = useChromiaNode();

  beforeAll(async () => {
    const client = getClient();
    _connection = createConnection(client);
  });

  describe("Test the account rate limit", () => {
    it("should show 10 at request count", async () => {
      const user = TestUser();

      const account = await AccountBuilder.account(_connection)
        .withSigner(user.signatureProvider)
        .build();

      const foundAccount = await _connection.getAccountById(account.id);
      const rateLimit = await foundAccount!.getRateLimit();
      expect(rateLimit.points).toBe(POINTS_AT_ACCOUNT_CREATION);
    });

    it("can make 4 operations", async () => {
      const user = TestUser();

      const account = await AccountBuilder.account(_connection)
        .withSigner(user.signatureProvider)
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
        .withSigner(user.signatureProvider)
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
          ftAuth(account.id, user.authDescriptor.id),
          op("ft4.test.authenticated_operation"),
          ftAuth(account.id, user.authDescriptor.id),
          op("ft4.test.authenticated_operation"),
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
        op("ft4.test.consume_point", accountId),
        0,
        requests,
      ),
      signers: [user.signatureProvider.pubKey],
    };

    return client.signAndSendUniqueTransaction(tx, user.signatureProvider);
  };
});
