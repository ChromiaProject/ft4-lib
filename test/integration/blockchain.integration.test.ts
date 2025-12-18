import { useChromiaNode } from "@ft4-test/util";
import { Connection, createConnection } from "@ft4/ft-session";
import { Config } from "@ft4/utils";

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
      authDescriptor: {
        maxRules: 8,
        maxNumberPerAccount: 10,
      },
    });
  });

  it("should provide ft4 rell-side version number", async () => {
    const info = await connection.getVersion();

    expect(info).toEqual("1.2.0");
  });

  it("should provide ft4 rell-side API version number", async () => {
    const info = await connection.getApiVersion();

    expect(info).toEqual(3);
  });
});
