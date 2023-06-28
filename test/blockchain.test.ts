import { version } from "../package.json";
import { Connection } from "../client/lib/ft3/types";
import { createChromiaClient } from "./util/blockchain-util";
import { Config } from "../client/lib/ft3/utils/types";
import { ft } from "../client/lib/ft3";
import { createConnection } from "/ft3/ft-session";

let connection: Connection;

describe("Blockchain", () => {
  beforeAll(async () => {
    connection = createConnection(await createChromiaClient());
  });
  it("should provide info", async () => {
    const config = await connection.getConfig();

    expect(config).toEqual(<Config>{
      rate_limit_active: 1,
      rate_limit_max_points: 10,
      rate_limit_recovery_time: 5000,
      rate_limit_points_at_account_creation: 1,
    });
  });

  it("should provide ft3 rell-side version number", async () => {
    const info = await connection.getVersion();

    expect(info).toEqual("4.0.0r");

    expect(ft.getClientVersion()).toEqual(version);
  });

  it.skip("should successfully post raw transactions", async () => {
    /*
    const user = testUser();
    const vault = testUser();
    const session = ftSession.changeUser(user);

    const rawTransaction = await ssoRawTransactionRegister(
      vault.authDescriptor,
      user.authDescriptor,
      legacyTransactionBuilder(user, session.get.gtxClient)
    );

    await ftSession.get.gtxClient
      .transactionFromRawTransaction(rawTransaction)
      .postAndWaitConfirmation();

    const account = await session.get.account.by.id(user.authDescriptor.id);

    expect(account).not.toBeNull();
    */
  });
});
