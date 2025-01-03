import { AccountBuilder, getNewAsset, useChromiaNode } from "@ft4-test/util";
import { ASSET_TYPE_FT4, Amount, Asset, createAmount } from "@ft4/asset";
import { createInMemoryFtKeyStore } from "@ft4/authentication";
import {
  Connection,
  createConnection,
  createKeyStoreInteractor,
} from "@ft4/ft-session";
import { IClient, encryption } from "postchain-client";

let connection: Connection;
let client: IClient;
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
  const getClient = useChromiaNode();

  beforeAll(async () => {
    client = getClient();
    connection = createConnection(client);
    asset1 = await getNewAsset(client, "asset_balance_1", "ASSET_BALANCE_1");
    asset2 = await getNewAsset(client, "asset_balance_2", "ASSET_BALANCE_2", 5);
  });

  it("returns asset balances when queried by account id", async () => {
    const account = await AccountBuilder.account(connection)
      .withBalances([
        { amount: 10, asset: asset1 },
        { amount: 20, asset: asset2 },
      ])
      .build();

    const balances = (await account.getBalances()).data.map((b) => ({
      asset: b.asset,
      amount: makeAmountBareBones(b.amount),
    }));

    expect(JSON.stringify(balances)).toStrictEqual(
      JSON.stringify([
        {
          asset: {
            id: asset1.id,
            name: asset1.name,
            symbol: asset1.symbol,
            decimals: asset1.decimals,
            blockchainRid: asset1.blockchainRid,
            iconUrl: "",
            type: ASSET_TYPE_FT4,
            supply: BigInt(10),
          },
          amount: makeAmountBareBones(createAmount(10, asset1.decimals)),
        },
        {
          asset: {
            id: asset2.id,
            name: asset2.name,
            symbol: asset2.symbol,
            decimals: asset2.decimals,
            blockchainRid: asset2.blockchainRid,
            iconUrl: "",
            type: ASSET_TYPE_FT4,
            supply: BigInt(2000000),
          },
          amount: makeAmountBareBones(createAmount(20, asset2.decimals)),
        },
      ]),
    );
  });

  it("returns balance for specific asset", async () => {
    const account = await AccountBuilder.account(connection)
      .withBalances([
        { amount: 40, asset: asset1 },
        { amount: 50, asset: asset2 },
      ])
      .build();

    const balance = await account.getBalanceByAssetId(asset2.id);

    expect(
      JSON.stringify({
        asset: balance!.asset,
        amount: makeAmountBareBones(balance!.amount),
      }),
    ).toStrictEqual(
      JSON.stringify({
        asset: {
          id: asset2.id,
          name: asset2.name,
          symbol: asset2.symbol,
          decimals: asset2.decimals,
          blockchainRid: asset2.blockchainRid,
          iconUrl: "",
          type: ASSET_TYPE_FT4,
          supply: BigInt(7000000),
        },
        amount: {
          value: BigInt(50 + "0".repeat(asset2.decimals)),
          decimals: asset2.decimals,
        },
      }),
    );
  });

  it("paginates asset balances", async () => {
    const asset1 = await getNewAsset(
      client,
      "asset_balance_3",
      "ASSET_BALANCE_3",
    );
    const asset2 = await getNewAsset(
      client,
      "asset_balance_4",
      "ASSET_BALANCE_4",
    );
    const asset3 = await getNewAsset(
      client,
      "asset_balance_5",
      "ASSET_BALANCE_5",
    );

    const keyPair = encryption.makeKeyPair();
    const keyStore = createInMemoryFtKeyStore(keyPair);

    const account = await AccountBuilder.account(connection)
      .withBalances([
        { amount: 10, asset: asset1 },
        { amount: 10, asset: asset2 },
        { amount: 10, asset: asset3 },
      ])
      .build();

    const session = await createKeyStoreInteractor(client, keyStore).getSession(
      account.id,
    );

    const { data, nextCursor } = await session.account.getBalances(2);

    expect(data.length).toBe(2);

    const { data: data2 } = await session.account.getBalances(2, nextCursor);
    expect(data2.length).toBe(1);
  });
});
