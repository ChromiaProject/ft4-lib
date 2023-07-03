import { createAmount } from "../client/lib/ft4/asset/amount";
import { Amount } from "../client/lib/ft4/asset/interfaces";
import { Asset } from "../client/lib/ft4/asset/types";
import {
  createConnection,
  createKeyStoreInteractor,
} from "../client/lib/ft4/ft-session";
import { Connection, ftUserSession } from "../client/lib/ft4/types";
import AccountBuilder from "./util/account-builder";
import {
  createChromiaClient,
  getNewAsset,
  getUserSession,
} from "./util/blockchain-util";
import testUser from "./util/test-user";
import { KeyPair } from "/cryptoUtils";
import { createInMemoryFtKeyStore } from "/ft4/authentication/ft/key-stores/in-memory";

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
    connection = createConnection(await createChromiaClient());
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
    const balances = (await foundAccount.getBalances()).map((b) => ({
      asset: b.asset,
      amount: makeAmountBareBones(b.amount),
    }));

    expect(balances).toHaveLength(2);
    expect(balances).toContainEqual({
      asset: {
        id: asset1.id,
        name: asset1.name,
        decimals: asset1.decimals,
        brid: asset1.brid,
        supply: BigInt(10),
      },
      amount: makeAmountBareBones(createAmount(10, asset1.decimals)),
    });
    expect(balances).toContainEqual({
      asset: {
        id: asset2.id,
        name: asset2.name,
        decimals: asset2.decimals,
        brid: asset2.brid,
        supply: BigInt("20" + "0".repeat(asset2.decimals)),
      },
      amount: makeAmountBareBones(createAmount(20, asset2.decimals)),
    });
  });

  it("should return balance for specific asset", async () => {
    const account = await AccountBuilder.account(ft)
      .withBalances([
        { amount: 40, asset: asset1 },
        { amount: 50, asset: asset2 },
      ])
      .build();

    const foundAccount = await connection.getAccountById(account.id);
    const balance = await foundAccount!.getBalanceByAssetId(asset2.id);

    expect({
      asset: balance.asset,
      amount: makeAmountBareBones(balance.amount),
    }).toEqual({
      asset: {
        id: asset2.id,
        name: asset2.name,
        decimals: asset2.decimals,
        brid: asset2.brid,
        iconUrl: "",
        supply: BigInt(70 + "0".repeat(asset2.decimals)),
        symbol: asset2.symbol,
      },
      amount: {
        value: BigInt(50 + "0".repeat(asset2.decimals)),
        decimals: asset2.decimals,
      },
    });
  });

  it("paginates asset balances", async () => {
    const asset1 = await getNewAsset(ft);
    const asset2 = await getNewAsset(ft);
    const asset3 = await getNewAsset(ft);

    const client = await createChromiaClient();
    const keyPair = new KeyPair();
    const keyStore = createInMemoryFtKeyStore(keyPair);

    const account = await AccountBuilder.account(ft)
      .withBalances([
        { amount: 10, asset: asset1 },
        { amount: 10, asset: asset2 },
        { amount: 10, asset: asset3 },
      ])
      .build();

    const ad = account.authDescriptors[0];
    const session = await createKeyStoreInteractor(client, keyStore).getSession(
      ad.id
    );

    const { data, nextCursor } = await session.account.getBalancesPaginated(2);

    expect(data.length).toBe(2);

    const { data: data2 } = await session.account.getBalancesPaginated(
      2,
      nextCursor
    );
    expect(data2.length).toBe(1);
  });
});
