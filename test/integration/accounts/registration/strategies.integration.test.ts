import { useChromiaNode } from "@ft4-test/util";
import { Connection, createConnection } from "@ft4/ft-session";

let connection: Connection;

describe("Test strategies", () => {
  const getClient = useChromiaNode();

  beforeAll(async () => {
    connection = createConnection(getClient());
  });

  it("can return list of enabled strategies", async () => {
    const strategies = await connection.getEnabledRegistrationStrategies();

    expect(strategies).toEqual([
      "ft4.ras_open",
      "ft4.ras_transfer_open",
      "ft4.ras_transfer_fee",
      "ft4.ras_transfer_subscription",
    ]);
  });
});
