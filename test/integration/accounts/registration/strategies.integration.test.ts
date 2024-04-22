import { useChromiaNode } from "@ft4-test/util";
import { enabledRegistrationStrategies } from "@ft4/registration";
import { IClient } from "postchain-client";

let client: IClient;

describe("Test strategies", () => {
  const getClient = useChromiaNode();

  beforeAll(async () => {
    client = getClient();
  });

  it("can return list of enabled strategies", async () => {
    const strategies = await client.query(enabledRegistrationStrategies());

    expect(strategies).toEqual([
      "ft4.ras_open",
      "ft4.ras_transfer_open",
      "ft4.ras_transfer_fee",
      "ft4.ras_transfer_subscription",
    ]);
  });
});
