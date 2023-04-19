import { Asset } from "../client/lib/ft3/asset/types";
import { createConnection } from "../client/lib/ft3/ft-session";
import { Connection, ftUserSession } from "../client/lib/ft3/interfaces";
import AccountBuilder from "./util/account-builder";
import { getNewAsset, getUserSession } from "./util/blockchain-util";
import testUser from "./util/test-user";

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

  beforeEach(() => {
    ft = ft.changeUser(testUser());
  });

  it("should be returned when queried by account id", async () => {
    const account = await AccountBuilder.account(ft)
      .withBalances([
        { amount: BigInt(10), asset: asset1 },
        { amount: BigInt(20), asset: asset2 },
      ])
      .build();

    const foundAccount = await connection.getAccountById(account.id);
    const balances = await foundAccount.getBalances();

    expect(balances).toEqual([
      {
        asset: {
          id: asset1.id,
          name: asset1.name,
          brid: asset1.brid,
        },
        amount: 10,
      },
      {
        asset: {
          id: asset2.id,
          name: asset2.name,
          brid: asset2.brid,
        },
        amount: 20,
      },
    ]);
  });

  it("should return balance for specific asset", async () => {
    const account = await AccountBuilder.account(ft)
      .withBalances([
        { amount: BigInt(40), asset: asset1 },
        { amount: BigInt(50), asset: asset2 },
      ])
      .build();

    const foundAccount = await connection.getAccountById(account.id);
    const balance = await foundAccount.getBalanceByAssetId(asset2.id);

    expect(balance).toEqual({
      asset: {
        id: asset2.id,
        name: asset2.name,
        brid: asset2.brid,
      },
      amount: 50,
    });
  });
});
