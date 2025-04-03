import { FT4_USER_TYPE } from "@ft4-test/util";
import { AccountResponse, getById } from "@ft4/accounts";
import { Connection, createConnection } from "@ft4/ft-session";
import { createStubClient } from "postchain-client";

let connection: Connection;
const mockBuffer = Buffer.alloc(32);
describe("getById", () => {
  beforeAll(async () => {
    connection = {
      ...createConnection(await createStubClient()),
      query: jest.fn(),
    };
  });
  it("returns null when account is not found", async () => {
    (connection.query as jest.Mock).mockResolvedValueOnce(null);

    const nullAccountResult = await getById(connection, "unknownAccountId");
    expect(nullAccountResult).toBeNull();
  });

  it("returns Account when query response is Buffer", async () => {
    (connection.query as jest.Mock).mockResolvedValueOnce(mockBuffer);

    const accountObjectFromBuffer = await getById(connection, mockBuffer);

    expect(accountObjectFromBuffer).toHaveProperty("id");
    expect(Buffer.isBuffer(accountObjectFromBuffer!.id)).toBe(true);
    expect(Buffer.compare(accountObjectFromBuffer!.id, mockBuffer)).toBe(0);
  });

  it("returns Account when query response is AccountResponse", async () => {
    const mockAccountResponse: AccountResponse = {
      id: mockBuffer,
      type: FT4_USER_TYPE,
    };
    (connection.query as jest.Mock).mockResolvedValueOnce(mockAccountResponse);

    const accountObjectFromAccounResponse = await getById(
      connection,
      mockAccountResponse.id,
    );

    expect(accountObjectFromAccounResponse).toHaveProperty("id");
    expect(Buffer.isBuffer(accountObjectFromAccounResponse!.id)).toBe(true);
    expect(
      Buffer.compare(accountObjectFromAccounResponse!.id, mockBuffer),
    ).toBe(0);
  });
});
