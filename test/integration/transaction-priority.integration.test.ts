import {
  AccountBuilder,
  singleSigUser as TestUser,
  useChromiaNode,
} from "@ft4-test/util";
import { ftAuth } from "@ft4/authentication";
import { Connection, createConnection } from "@ft4/ft-session";
import { op } from "@ft4/utils";
import { UnexpectedStatusError } from "postchain-client";

jest.setTimeout(2000000);

let _connection: Connection;

describe("Transaction priority", () => {
  const getClient = useChromiaNode();

  beforeAll(async () => {
    const client = getClient();
    _connection = createConnection(client);
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
              op("ft4.test.authenticated_operation"),
              ftAuth(account.id, user.authDescriptor.id),
              op("ft4.test.authenticated_operation"),
              ftAuth(account.id, user.authDescriptor.id),
              op("ft4.test.authenticated_operation"),
              ftAuth(account.id, user.authDescriptor.id),
              op("ft4.test.authenticated_operation"),
              ftAuth(account.id, user.authDescriptor.id),
              op("ft4.test.authenticated_operation"),
              ftAuth(account.id, user.authDescriptor.id),
              op("ft4.test.authenticated_operation"),
              ftAuth(account.id, user.authDescriptor.id),
              op("ft4.test.authenticated_operation"),
              ftAuth(account.id, user.authDescriptor.id),
              op("ft4.test.authenticated_operation"),
              ftAuth(account.id, user.authDescriptor.id),
              op("ft4.test.authenticated_operation"),
              ftAuth(account.id, user.authDescriptor.id),
              op("ft4.test.authenticated_operation"),
              ftAuth(account.id, user.authDescriptor.id),
              op("ft4.test.authenticated_operation"),
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
