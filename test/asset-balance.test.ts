import { createAmount } from "../client/lib/ft3/asset/amount";
import { Amount } from "../client/lib/ft3/asset/interfaces";
import { Asset } from "../client/lib/ft3/asset/types";
import { createConnection } from "../client/lib/ft3/ft-session";
import { Connection, ftUserSession } from "../client/lib/ft3/types";
import AccountBuilder from "./util/account-builder";
import { getNewAsset, getUserSession } from "./util/blockchain-util";
import testUser from "./util/test-user";

let ft: ftUserSession;
let connection: Connection;
let asset1: Asset;
let asset2: Asset;

function makeAmountBareBones(amount: Amount): {
  value: bigint;
  decimals: number;
} {
  return {
    value: amount.value,
    decimals: amount.decimals,
  };
}

describe("Asset balance", () => {
  beforeAll(async () => {
    ft = await getUserSession();
    connection = createConnection(ft.get.gtxClient);
    asset1 = await getNewAsset(ft);
    asset2 = await getNewAsset(ft, undefined, undefined, 5);
  });

  beforeEach(() => {
    ft = ft.changeUser(testUser());
  });

  it("should be returned when queried by account id", async () => {
    const account = await AccountBuilder.account(ft)
      .withBalances([
        { amount: 10, asset: asset1 },
        { amount: 20, asset: asset2 },
      ])
      .build();

    const foundAccount = await connection.getAccountById(account.id);
    const balances = await foundAccount.getBalances();

    expect(
      balances.map((b) => ({
        asset: b.asset,
        amount: makeAmountBareBones(b.amount),
      }))
    ).toEqual([
      {
        asset: {
          id: asset1.id,
          name: asset1.name,
          decimals: asset1.decimals,
          brid: asset1.brid,
          supply: 10,
        },
        amount: makeAmountBareBones(createAmount(10, asset1.decimals)),
      },
      {
        asset: {
          id: asset2.id,
          name: asset2.name,
          decimals: asset2.decimals,
          brid: asset2.brid,
          supply: 20,
        },
        amount: makeAmountBareBones(createAmount(20, asset2.decimals)),
      },
    ]);
  });

  it("should return balance for specific asset", async () => {
    const account = await AccountBuilder.account(ft)
      .withBalances([
        { amount: 40, asset: asset1 },
        { amount: 50, asset: asset2 },
      ])
      .build();

    const foundAccount = await connection.getAccountById(account.id);
    const balance = await foundAccount.getBalanceByAssetId(asset2.id);

    expect({
      asset: balance.asset,
      amount: makeAmountBareBones(balance.amount),
    }).toEqual({
      asset: {
        id: asset2.id,
        name: asset2.name,
        decimals: asset2.decimals,
        brid: asset2.brid,
        supply: 70,
      },
      amount: {
        value: BigInt("50" + "0".repeat(asset2.decimals)),
        decimals: asset2.decimals,
      },
    });
  });
});
