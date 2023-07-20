import { version } from "../package.json";
import { Connection } from "../client/lib/ft4/types";
import { createChromiaClient } from "./util/blockchain-util";
import { Config } from "../client/lib/ft4/utils/types";
import { ft } from "../client/lib/ft4";
import { createConnection } from "/ft4/ft-session";

let connection: Connection;

describe("Blockchain", () => {
  beforeAll(async () => {
    connection = createConnection(await createChromiaClient());
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

    expect(info).toEqual("0.1.1r");

    expect(ft.getClientVersion()).toEqual(version);
  });
});
