import {
  AccountBuilder,
  comparableAmount,
  comparableAsset,
  comparableObjectWithAssetAndAmount,
  comparableObjectWithAmount,
  getNewAsset,
  getSessionForAuthenticatedAccount,
  useChromiaNode,
  lockAccountId,
} from "@ft4-test/util";
import {
  Asset,
  createAmount,
  getLockedAssetAggregatedBalance,
  getLockedAssetAggregatedBalances,
  getLockedAssetBalance,
  getLockedAssetBalances,
  getLockAccounts,
  getLockAccountsWithNonZeroBalances,
} from "@ft4/asset/";
import { Connection, createConnection } from "@ft4/ft-session";
import { op } from "@ft4/utils";
import { IClient } from "postchain-client";

let asset1: Asset;
let asset2: Asset;
let client: IClient;
let connection: Connection;

describe("Asset locking", () => {
  const getClient = useChromiaNode();

  beforeAll(async () => {
    client = getClient();
    asset1 = await getNewAsset(client, "asset_locking1", "ASL1");
    asset2 = await getNewAsset(client, "asset_locking2", "ASL2");
    connection = createConnection(client);
  });

  it("can fetch lock accounts for specific account", async () => {
    const account = await AccountBuilder.account(connection)
      .withBalance(asset1, createAmount(100, asset1.decimals))
      .withPoints(5)
      .build();

    const session = getSessionForAuthenticatedAccount(account);

    await session.call(
      op(
        "lock_asset",
        "LOCK1",
        account.id,
        asset1.id,
        createAmount(40, asset1.decimals).value,
      ),
      op(
        "lock_asset",
        "LOCK2",
        account.id,
        asset1.id,
        createAmount(30, asset1.decimals).value,
      ),
      op(
        "lock_asset",
        "LOCK3",
        account.id,
        asset1.id,
        createAmount(30, asset1.decimals).value,
      ),
    );

    const lockAccounts = await getLockAccounts(connection, account.id);

    expect(lockAccounts.length).toBe(3);
    expect(lockAccounts[0].type).toEqual("LOCK1");
    expect(lockAccounts[0].account.id).toEqual(
      lockAccountId(account.id, "LOCK1"),
    );
    expect(lockAccounts[1].type).toEqual("LOCK2");
    expect(lockAccounts[1].account.id).toEqual(
      lockAccountId(account.id, "LOCK2"),
    );
    expect(lockAccounts[2].type).toEqual("LOCK3");
    expect(lockAccounts[2].account.id).toEqual(
      lockAccountId(account.id, "LOCK3"),
    );
  });

  it("can fetch lock accounts with non-zero balances for specific account", async () => {
    const account = await AccountBuilder.account(connection)
      .withBalance(asset1, createAmount(100, asset1.decimals))
      .withPoints(5)
      .build();

    const session = getSessionForAuthenticatedAccount(account);

    await session.call(
      op(
        "lock_asset",
        "LOCK1",
        account.id,
        asset1.id,
        createAmount(40, asset1.decimals).value,
      ),
      op(
        "lock_asset",
        "LOCK2",
        account.id,
        asset1.id,
        createAmount(30, asset1.decimals).value,
      ),
      op(
        "lock_asset",
        "LOCK3",
        account.id,
        asset1.id,
        createAmount(30, asset1.decimals).value,
      ),
      op(
        "unlock_asset",
        "LOCK2",
        account.id,
        asset1.id,
        createAmount(30, asset1.decimals).value,
      ),
    );

    const lockAccounts = await getLockAccountsWithNonZeroBalances(
      connection,
      account.id,
    );

    expect(lockAccounts.length).toBe(2);
    expect(lockAccounts[0].type).toEqual("LOCK1");
    expect(lockAccounts[0].account.id).toEqual(
      lockAccountId(account.id, "LOCK1"),
    );
    expect(lockAccounts[1].type).toEqual("LOCK3");
    expect(lockAccounts[1].account.id).toEqual(
      lockAccountId(account.id, "LOCK3"),
    );
  });

  it("can fetch locked asset balance for specific asset in pages", async () => {
    const account = await AccountBuilder.account(connection)
      .withBalance(asset1, createAmount(100, asset1.decimals))
      .withPoints(5)
      .build();

    const session = getSessionForAuthenticatedAccount(account);

    await session.call(
      op(
        "lock_asset",
        "LOCK1",
        account.id,
        asset1.id,
        createAmount(40, asset1.decimals).value,
      ),
      op(
        "lock_asset",
        "LOCK2",
        account.id,
        asset1.id,
        createAmount(30, asset1.decimals).value,
      ),
      op(
        "lock_asset",
        "LOCK3",
        account.id,
        asset1.id,
        createAmount(30, asset1.decimals).value,
      ),
    );

    const page1 = await getLockedAssetBalance(
      connection,
      account.id,
      asset1.id,
      null,
      1,
    );

    expect(page1.data.map(comparableObjectWithAmount)).toEqual([
      {
        type: "LOCK1",
        amount: comparableAmount(createAmount(40, asset1.decimals)),
      },
    ]);

    const page2 = await getLockedAssetBalance(
      connection,
      account.id,
      asset1.id,
      null,
      2,
      page1.nextCursor,
    );

    expect(page2.data.map(comparableObjectWithAmount)).toEqual([
      {
        type: "LOCK2",
        amount: comparableAmount(createAmount(30, asset1.decimals)),
      },
      {
        type: "LOCK3",
        amount: comparableAmount(createAmount(30, asset1.decimals)),
      },
    ]);
    expect(page2.nextCursor).toBeNull();
  });

  it("can filter locked asset balance for asset by lock type", async () => {
    const account = await AccountBuilder.account(connection)
      .withBalance(asset1, createAmount(100, asset1.decimals))
      .withPoints(5)
      .build();

    const session = getSessionForAuthenticatedAccount(account);

    await session.call(
      op(
        "lock_asset",
        "LOCK1",
        account.id,
        asset1.id,
        createAmount(15, asset1.decimals).value,
      ),
      op(
        "lock_asset",
        "LOCK2",
        account.id,
        asset1.id,
        createAmount(25, asset1.decimals).value,
      ),
      op(
        "lock_asset",
        "LOCK3",
        account.id,
        asset1.id,
        createAmount(35, asset1.decimals).value,
      ),
    );

    const response = await getLockedAssetBalance(
      connection,
      account.id,
      asset1.id,
      ["LOCK2", "LOCK3"],
    );

    expect(response.data.map(comparableObjectWithAmount)).toEqual([
      {
        type: "LOCK2",
        amount: comparableAmount(createAmount(25, asset1.decimals)),
      },
      {
        type: "LOCK3",
        amount: comparableAmount(createAmount(35, asset1.decimals)),
      },
    ]);
  });

  it("can fetch locked asset aggregated balance for asset", async () => {
    const account = await AccountBuilder.account(connection)
      .withBalance(asset1, createAmount(100, asset1.decimals))
      .withPoints(5)
      .build();

    const session = getSessionForAuthenticatedAccount(account);

    await session.call(
      op(
        "lock_asset",
        "LOCK1",
        account.id,
        asset1.id,
        createAmount(5, asset1.decimals).value,
      ),
      op(
        "lock_asset",
        "LOCK2",
        account.id,
        asset1.id,
        createAmount(10, asset1.decimals).value,
      ),
      op(
        "lock_asset",
        "LOCK3",
        account.id,
        asset1.id,
        createAmount(15, asset1.decimals).value,
      ),
    );

    const amount = await getLockedAssetAggregatedBalance(
      connection,
      account.id,
      asset1.id,
    );

    expect(comparableAmount(amount)).toEqual(
      comparableAmount(createAmount(30, asset1.decimals)),
    );
  });

  it("can filter locked asset aggregated balance for asset by lock type", async () => {
    const account = await AccountBuilder.account(connection)
      .withBalance(asset1, createAmount(100, asset1.decimals))
      .withPoints(5)
      .build();

    const session = getSessionForAuthenticatedAccount(account);

    await session.call(
      op(
        "lock_asset",
        "LOCK1",
        account.id,
        asset1.id,
        createAmount(5, asset1.decimals).value,
      ),
      op(
        "lock_asset",
        "LOCK2",
        account.id,
        asset1.id,
        createAmount(10, asset1.decimals).value,
      ),
      op(
        "lock_asset",
        "LOCK3",
        account.id,
        asset1.id,
        createAmount(15, asset1.decimals).value,
      ),
    );

    const amount = await getLockedAssetAggregatedBalance(
      connection,
      account.id,
      asset1.id,
      ["LOCK1", "LOCK3"],
    );

    expect(comparableAmount(amount)).toEqual(
      comparableAmount(createAmount(20, asset1.decimals)),
    );
  });

  it("can fetch locked asset balances in pages", async () => {
    const account = await AccountBuilder.account(connection)
      .withBalance(asset1, createAmount(100, asset1.decimals))
      .withPoints(5)
      .build();

    // Get asset to load updated supply
    const asset = comparableAsset((await connection.getAssetById(asset1.id))!);

    const session = getSessionForAuthenticatedAccount(account);

    await session.call(
      op(
        "lock_asset",
        "LOCK1",
        account.id,
        asset1.id,
        createAmount(10, asset1.decimals).value,
      ),
      op(
        "lock_asset",
        "LOCK2",
        account.id,
        asset1.id,
        createAmount(20, asset1.decimals).value,
      ),
      op(
        "lock_asset",
        "LOCK3",
        account.id,
        asset1.id,
        createAmount(30, asset1.decimals).value,
      ),
    );

    const page1 = await getLockedAssetBalances(connection, account.id, null, 2);

    expect(page1.data.map(comparableObjectWithAssetAndAmount)).toEqual([
      {
        type: "LOCK1",
        asset: asset,
        amount: comparableAmount(createAmount(10, asset1.decimals)),
      },
      {
        type: "LOCK2",
        asset: asset,
        amount: comparableAmount(createAmount(20, asset.decimals)),
      },
    ]);

    const page2 = await getLockedAssetBalances(
      connection,
      account.id,
      null,
      1,
      page1.nextCursor,
    );

    expect(page2.data.map(comparableObjectWithAssetAndAmount)).toEqual([
      {
        type: "LOCK3",
        asset: asset,
        amount: comparableAmount(createAmount(30, asset.decimals)),
      },
    ]);
    expect(page2.nextCursor).toBeNull();
  });

  it("can filter locked asset balances by lock type", async () => {
    const account = await AccountBuilder.account(connection)
      .withBalance(asset1, createAmount(100, asset1.decimals))
      .withPoints(5)
      .build();

    const asset = comparableAsset((await connection.getAssetById(asset1.id))!);

    const session = getSessionForAuthenticatedAccount(account);

    await session.call(
      op(
        "lock_asset",
        "LOCK1",
        account.id,
        asset1.id,
        createAmount(40, asset1.decimals).value,
      ),
      op(
        "lock_asset",
        "LOCK2",
        account.id,
        asset1.id,
        createAmount(60, asset1.decimals).value,
      ),
    );

    const response = await getLockedAssetBalances(connection, account.id, [
      "LOCK2",
    ]);

    expect(response.data.map(comparableObjectWithAssetAndAmount)).toEqual([
      {
        type: "LOCK2",
        asset: asset,
        amount: comparableAmount(createAmount(60, asset1.decimals)),
      },
    ]);
    expect(response.nextCursor).toBeNull();
  });

  it("can fetch locked asset aggregated balances in pages", async () => {
    const account = await AccountBuilder.account(connection)
      .withBalance(asset1, createAmount(100, asset1.decimals))
      .withBalance(asset2, createAmount(100, asset2.decimals))
      .withPoints(5)
      .build();

    const _asset1 = comparableAsset(
      (await connection.getAssetById(asset1.id))!,
    );
    const _asset2 = comparableAsset(
      (await connection.getAssetById(asset2.id))!,
    );

    const session = getSessionForAuthenticatedAccount(account);

    await session.call(
      op(
        "lock_asset",
        "LOCK1",
        account.id,
        asset1.id,
        createAmount(10, asset1.decimals).value,
      ),
      op(
        "lock_asset",
        "LOCK2",
        account.id,
        asset1.id,
        createAmount(20, asset1.decimals).value,
      ),
      op(
        "lock_asset",
        "LOCK1",
        account.id,
        asset2.id,
        createAmount(30, asset2.decimals).value,
      ),
      op(
        "lock_asset",
        "LOCK2",
        account.id,
        asset2.id,
        createAmount(40, asset2.decimals).value,
      ),
    );

    const page1 = await getLockedAssetAggregatedBalances(
      connection,
      account.id,
      null,
      1,
    );

    expect(page1.data.map(comparableObjectWithAssetAndAmount)).toEqual([
      {
        asset: _asset1,
        amount: comparableAmount(createAmount(30, asset1.decimals)),
      },
    ]);

    const page2 = await getLockedAssetAggregatedBalances(
      connection,
      account.id,
      null,
      1,
      page1.nextCursor,
    );

    expect(page2.data.map(comparableObjectWithAssetAndAmount)).toEqual([
      {
        asset: _asset2,
        amount: comparableAmount(createAmount(70, asset2.decimals)),
      },
    ]);
    expect(page2.nextCursor).toBeNull();
  });

  it("can filter locked asset aggregated balances by lock type", async () => {
    const account = await AccountBuilder.account(connection)
      .withBalance(asset1, createAmount(100, asset1.decimals))
      .withBalance(asset2, createAmount(100, asset2.decimals))
      .withPoints(5)
      .build();

    const _asset1 = comparableAsset(
      (await connection.getAssetById(asset1.id))!,
    );
    const _asset2 = comparableAsset(
      (await connection.getAssetById(asset2.id))!,
    );

    const session = getSessionForAuthenticatedAccount(account);

    await session.call(
      op(
        "lock_asset",
        "LOCK1",
        account.id,
        asset1.id,
        createAmount(50, asset1.decimals).value,
      ),
      op(
        "lock_asset",
        "LOCK2",
        account.id,
        asset1.id,
        createAmount(40, asset1.decimals).value,
      ),
      op(
        "lock_asset",
        "LOCK1",
        account.id,
        asset2.id,
        createAmount(30, asset2.decimals).value,
      ),
      op(
        "lock_asset",
        "LOCK2",
        account.id,
        asset2.id,
        createAmount(20, asset2.decimals).value,
      ),
    );

    const response = await getLockedAssetAggregatedBalances(
      connection,
      account.id,
      ["LOCK2"],
    );

    expect(response.data.map(comparableObjectWithAssetAndAmount)).toEqual([
      {
        asset: _asset1,
        amount: comparableAmount(createAmount(40, asset1.decimals)),
      },
      {
        asset: _asset2,
        amount: comparableAmount(createAmount(20, asset2.decimals)),
      },
    ]);
  });
});
