import {
  AccountBuilder,
  comparableAmount,
  comparableAsset,
  comparableObjectWithAssetAndAmount,
  comparableObjectWithAmount,
  getNewAsset,
  // getSessionForAuthenticatedAccount,
  useChromiaNode,
  lockAccountId,
} from "@ft4-test/util";
import { AuthenticatedAccount, AccountLinkFilter } from "@ft4/accounts";
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
import {
  Connection,
  Session,
  createConnection,
  createSession,
} from "@ft4/ft-session";
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

  let account: AuthenticatedAccount;
  let session: Session;
  beforeEach(async () => {
    account = await AccountBuilder.account(connection)
      .withBalance(asset1, createAmount(100, asset1.decimals))
      .withPoints(5)
      .build();

    // session = getSessionForAuthenticatedAccount(account);
    session = createSession(connection, account.authenticator);
  });

  async function lockAmounts(
    account: AuthenticatedAccount,
    asset: Asset,
    amounts: number[],
  ) {
    await session.call(
      ...amounts.map((amount, i) =>
        op(
          "ft4.test.lock_asset",
          `LOCK${i + 1}`,
          account.id,
          asset.id,
          createAmount(amount, asset.decimals).value,
        ),
      ),
    );
  }

  it("returns filtered account links", async () => {
    await lockAmounts(account, asset1, [40, 30, 30]);
    const lockAccounts = await getLockAccounts(connection, account.id);
    const accountLinkFilter: AccountLinkFilter = {
      account_ids: null,
      secondary_id: lockAccounts[0].account.id,
      type: null,
    };
    const filteredAccountLinks =
      await connection.getAccountLinksFiltered(accountLinkFilter);
    expect(filteredAccountLinks.data.length).toBeGreaterThan(0);
    expect(filteredAccountLinks.data[0].secondary.id).toEqual(
      lockAccounts[0].account.id,
    );
  });

  it("can fetch lock accounts for specific account", async () => {
    await lockAmounts(account, asset1, [40, 30, 30]);

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

  it("can fetch lock accounts for specific account", async () => {
    await lockAmounts(account, asset1, [40, 30, 30]);

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
    await lockAmounts(account, asset1, [40, 30, 30]);
    await session.call(
      op(
        "ft4.test.unlock_asset",
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
    await lockAmounts(account, asset1, [40, 30, 30]);

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
    await lockAmounts(account, asset1, [15, 25, 35]);

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
    await lockAmounts(account, asset1, [5, 10, 15]);

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
    await lockAmounts(account, asset1, [5, 10, 15]);

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
    // Get asset to load updated supply
    const asset = comparableAsset((await connection.getAssetById(asset1.id))!);
    await lockAmounts(account, asset1, [10, 20, 30]);

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
    const asset = comparableAsset((await connection.getAssetById(asset1.id))!);
    await lockAmounts(account, asset1, [40, 60]);

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

    await lockAmounts(account, asset1, [10, 20]);
    await lockAmounts(account, asset2, [30, 40]);

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

    await lockAmounts(account, asset1, [50, 40]);
    await lockAmounts(account, asset2, [30, 20]);

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
