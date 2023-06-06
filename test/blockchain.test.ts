import testUser from "./util/test-user";
import { version } from "../package.json";
import { ftUserSession } from "../client/lib/ft3/types";
import { getUserSession } from "./util/blockchain-util";
import { ChainInfo } from "../client/lib/ft3/utils/types";
import { ft } from "../client/lib/ft3";
import { ssoRawTransactionRegister } from "../client/lib/ft3/account/account-op-functions";
import { legacyTransactionBuilder } from "../client/lib/ft3/utils/transaction-builder-old";

let ftSession: ftUserSession;

describe("Blockchain", () => {
  beforeAll(async () => {
    ftSession = await getUserSession();
  });
  it("should provide info", async () => {
    const info = await ftSession.get.chainInfo();

    expect(info).toEqual(<ChainInfo>{
      name: "test",
      website: "test_website",
      description: "test_description",
      rate_limit_active: 1,
      rate_limit_max_points: 10,
      rate_limit_recovery_time: 5000,
      rate_limit_points_at_account_creation: 1,
    });
  });

  it("should provide ft3 rell-side version number", async () => {
    const info = await ftSession.get.version();

    expect(info).toEqual("4.0.0r");

    expect(ft.getClientVersion()).toEqual(version);
  });

  it.skip("should be able to link other chain", async () => {
    //const brid = generateId();
    // await ftSession.linkChain(brid);
    // await expect(ftSession.isLinkedWithChain(brid)).resolves.toEqual(true);
  });

  it.skip("should be able to link multiple chains", async () => {
    //const brid1 = generateId();
    //const brid2 = generateId();
    // await ftSession.linkChain(brid1);
    // await ftSession.linkChain(brid2);
    // const linkedChains = await ftSession.getLinkedChainBRIDs();
    // expect(linkedChains).toContainEqual(brid1);
    // expect(linkedChains).toContainEqual(brid2);
  });

  it.skip("should return false when isLinkedWithChain is called for unknown chain id", async () => {
    // await expect(ftSession.isLinkedWithChain(generateId())).resolves.toEqual(
    //   false
    // );
  });

  it.skip("should successfully post raw transactions", async () => {
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
  });
});
