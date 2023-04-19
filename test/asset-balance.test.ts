import { Asset } from "../client/lib/ft3/asset/types";
import { createConnection } from "../client/lib/ft3/ft-session";
import { Connection, ftUserSession } from "../client/lib/ft3/interfaces";
import AccountBuilder from "./util/account-builder";
import { getNewAsset, getUserSession } from "./util/blockchain-util";

let ft: ftUserSession;
let connection: Connection;
let asset1: Asset;
let asset2: Asset;

describe("Asset balance", () => {
  beforeAll(async () => {
    ft = await getUserSession();
    connection = createConnection(ft.get.gtxClient);
    asset1 = await getNewAsset(ft);
    asset2 = await getNewAsset(ft);
  });

  it("should be returned when queried by account id", async () => {
    const account = await AccountBuilder.account(ft)
      .withBalances([
        { amount: BigInt(10), asset: asset1 },
        { amount: BigInt(20), asset: asset2 },
      ])
      .build();

    const account1 = await connection.getAccountById(account.id);
    const assets = await account1.getBalances();

    expect(assets.length).toEqual(2);
  });
});
