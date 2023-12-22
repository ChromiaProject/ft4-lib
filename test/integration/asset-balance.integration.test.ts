import { IClient, encryption } from "postchain-client";
import { createAmount } from "@ft4/asset/amount";
import { Amount } from "@ft4/asset/interfaces";
import { Asset } from "@ft4/asset/types";
import { createConnection, createKeyStoreInteractor } from "@ft4/ft-session";
import { Connection } from "@ft4/types";
import AccountBuilder from "../util/account-builder";
import { getNewAsset } from "../util/blockchain-util";
import { createInMemoryFtKeyStore } from "@ft4/authentication/ft/key-stores/in-memory";
import { useChromiaNode } from "@ft4/util/chromia-node";

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
    asset1 = await getNewAsset(client);
    asset2 = await getNewAsset(client, undefined, undefined, 5);
  });

  it("should be returned when queried by account id", async () => {
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

    expect(balances).toEqual([
      {
        asset: {
          id: asset1.id,
          name: asset1.name,
          symbol: asset1.symbol,
          decimals: asset1.decimals,
          blockchainRid: asset1.blockchainRid,
          supply: BigInt(10),
          iconUrl: "",
        },
        amount: makeAmountBareBones(createAmount(10, asset1.decimals)),
      },
      {
        asset: {
          id: asset2.id,
          name: asset2.name,
          decimals: asset2.decimals,
          blockchainRid: asset2.blockchainRid,
          supply: BigInt("20" + "0".repeat(asset2.decimals)),
          symbol: asset2.symbol,
          iconUrl: "",
        },
        amount: makeAmountBareBones(createAmount(20, asset2.decimals)),
      },
    ]);
  });

  it("should return balance for specific asset", async () => {
    const account = await AccountBuilder.account(connection)
      .withBalances([
        { amount: 40, asset: asset1 },
        { amount: 50, asset: asset2 },
      ])
      .build();

    const balance = await account.getBalanceByAssetId(asset2.id);

    expect({
      asset: balance!.asset,
      amount: makeAmountBareBones(balance!.amount),
    }).toEqual({
      asset: {
        id: asset2.id,
        name: asset2.name,
        decimals: asset2.decimals,
        blockchainRid: asset2.blockchainRid,
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
    const asset1 = await getNewAsset(client);
    const asset2 = await getNewAsset(client);
    const asset3 = await getNewAsset(client);

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
