import { Connection } from "@ft4/types";
import { Config } from "@ft4/utils/types";
import { createConnection } from "@ft4/ft-session";
import { useChromiaNode } from "/util/chromia-node";

let connection: Connection;

describe("Blockchain", () => {
  const getClient = useChromiaNode();

  beforeAll(async () => {
    const client = getClient();
    connection = createConnection(client);
  });
  it("should provide info", async () => {
    const config = await connection.getConfig();

    expect(config).toEqual(<Config>{
      rateLimit: {
        active: 1,
        maxPoints: 10,
        recoveryTime: 5000,
        pointsAtAccountCreation: 2,
      },
    });
  });

  it("should provide ft4 rell-side version number", async () => {
    const info = await connection.getVersion();

    expect(info).toEqual("0.1.7");
  });
});
