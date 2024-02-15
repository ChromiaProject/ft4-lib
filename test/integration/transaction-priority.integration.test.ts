import { createConnection } from "@ft4/ft-session";
import { Connection } from "@ft4/types";
import AccountBuilder from "@ft4/util/account-builder";
import TestUser from "@ft4/util/test-user";
import { ftAuth } from "@ft4/authentication";
import { useChromiaNode } from "@ft4/util/chromia-node";
import { Config } from "@ft4/utils/types";
import { UnexpectedStatusError } from "postchain-client";
import { op } from "@ft4/utils";

jest.setTimeout(2000000);

let _connection: Connection;

const REQUEST_MAX_COUNT = 10;
const RECOVERY_TIME = 5000;
const POINTS_AT_ACCOUNT_CREATION = 2;

describe("Transaction priority", () => {
  const getClient = useChromiaNode();

  beforeAll(async () => {
    const client = getClient();
    _connection = createConnection(client);
  });

  describe("Blockchain request configuration in config.yaml", () => {
    it("should have 10 max requests, 5000 milliseconds recovery time and 2 points at account creation", async () => {
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

  describe("Transaction queue", () => {
    it("rejects transactions with too many operations with 503 response", async () => {
      const user = TestUser();

      const account = await AccountBuilder.account(_connection)
        .withSigner(user.signatureProvider)
        .build();

      await expect(
        _connection.client.signAndSendUniqueTransaction(
          {
            operations: [
              ftAuth(account.id, user.authDescriptor.id),
              op("test_authenticated_operation"),
              ftAuth(account.id, user.authDescriptor.id),
              op("test_authenticated_operation"),
              ftAuth(account.id, user.authDescriptor.id),
              op("test_authenticated_operation"),
              ftAuth(account.id, user.authDescriptor.id),
              op("test_authenticated_operation"),
              ftAuth(account.id, user.authDescriptor.id),
              op("test_authenticated_operation"),
              ftAuth(account.id, user.authDescriptor.id),
              op("test_authenticated_operation"),
              ftAuth(account.id, user.authDescriptor.id),
              op("test_authenticated_operation"),
              ftAuth(account.id, user.authDescriptor.id),
              op("test_authenticated_operation"),
              ftAuth(account.id, user.authDescriptor.id),
              op("test_authenticated_operation"),
              ftAuth(account.id, user.authDescriptor.id),
              op("test_authenticated_operation"),
              ftAuth(account.id, user.authDescriptor.id),
              op("test_authenticated_operation"),
            ],
            signers: [user.signatureProvider.pubKey],
          },
          user.signatureProvider,
        ),
      ).rejects.toStrictEqual(
        new UnexpectedStatusError(503, '{"error":"Transaction queue is full"}'),
      );
    });
  });
});
