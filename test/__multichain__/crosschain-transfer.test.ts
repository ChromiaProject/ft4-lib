import { setCrosschainAndTransferHistoryEntryFilter } from "@ft4-test/integration/assets/asset-filter-helpers";
import {
  AccountBuilder,
  addNewAssetIfNeeded,
  adminUser,
  createChromiaClientToMultichain,
  fetchBlockchains,
  getNewAsset,
} from "@ft4-test/util";
import { AuthFlag, getTransferDetailsByAsset } from "@ft4/accounts";
import { registerCrosschainAsset } from "@ft4/admin";
import { createAmount } from "@ft4/asset";
import { noopAuthenticator, days, FtKeyStore } from "@ft4/authentication";
import {
  applyTransfer,
  crosschainTransfer,
  initTransfer,
} from "@ft4/crosschain";
import { createConnection } from "@ft4/ft-session";
import { registerAccount, registrationStrategy } from "@ft4/registration";
import { transactionBuilder } from "@ft4/transaction-builder";
import { BufferId } from "@ft4/utils";
import { Operation, RawGtx, gtv } from "postchain-client";

describe("Crosschain transfer", () => {
  it("transfers successfully with one hop", async () => {
    const { multichain00, multichain01 } = await fetchBlockchains();

    const connection00 = createConnection(
      await createChromiaClientToMultichain(multichain00.rid),
    );
    const connection01 = createConnection(
      await createChromiaClientToMultichain(multichain01.rid),
    );

    const asset00 = await getNewAsset(
      connection00.client,
      "crosschain-transfer-test-asset",
      "CROSSCHAIN-transfer-test-asset",
    );
    await registerCrosschainAsset(
      connection01.client,
      adminUser().signatureProvider,
      asset00.id,
      multichain00.rid,
    );

    const account00 = await AccountBuilder.account(connection00)
      .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
      .withBalance(asset00, createAmount(100, asset00.decimals))
      .build();

    const account01 = await AccountBuilder.account(connection01)
      .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
      .build();

    const tb = transactionBuilder(account00.authenticator, connection00.client);

    const initOperation = initTransfer(
      account01.id,
      asset00.id,
      createAmount(100, asset00.decimals),
      [multichain01.rid],
      10000000000000,
    );

    let transferTransactionRid: Buffer | undefined = undefined;
    await new Promise<void>((resolve, reject) => {
      const onAnchoredHandler = async (
        data: {
          operation: Operation;
          opIndex: number;
          tx: RawGtx;
          createProof: (blockchainRid: BufferId) => Promise<Operation>;
        } | null,
        error: Error | null,
      ) => {
        if (error) {
          reject(error);
          return;
        }
        if (!data) {
          reject(new Error("No data provided"));
          return;
        }
        const iccfProofOperation = await data.createProof(multichain01.rid);
        try {
          await transactionBuilder(account00.authenticator, connection01.client)
            .add(iccfProofOperation, {
              authenticator: noopAuthenticator,
            })
            .add(
              applyTransfer(data.tx, data.opIndex, data.tx, data.opIndex, 0),
              { authenticator: noopAuthenticator },
            )
            .buildAndSend();
        } catch (error) {
          reject(error);
        }

        resolve();
      };

      tb.add(initOperation, { onAnchoredHandler })
        .buildAndSendWithAnchoring()
        .then((res) => {
          transferTransactionRid = res.receipt.transactionRid;
        });
    });

    expect(
      (await account01.getBalanceByAssetId(asset00.id))?.amount.value,
    ).toEqual(createAmount(100, asset00.decimals).value);

    const history = await account00.getTransferHistory();

    const entry = history.data[0];
    expect(entry.isInput).toEqual(true);
    expect(entry.operationName).toEqual(initOperation.name);
    expect(entry.delta.value).toEqual(100n);
    expect(entry.asset.id).toEqual(asset00.id);
    expect(entry.transactionId).toEqual(transferTransactionRid);
    expect(entry.opIndex).toEqual(1);
    expect(entry.isCrosschain).toBeTruthy();

    const transferDetails = await connection00.getTransferDetails(
      transferTransactionRid!,
      entry.opIndex,
    );
    expect(transferDetails.length).toEqual(2);
    expect(transferDetails[0].blockchainRid).toEqual(multichain00.rid);
    expect(transferDetails[0].accountId).toEqual(account00.id);
    expect(transferDetails[0].assetId).toEqual(asset00.id);
    expect(transferDetails[0].delta).toEqual(100n);
    expect(transferDetails[0].isInput).toEqual(true);
    expect(transferDetails[1].blockchainRid).toEqual(multichain01.rid);
    expect(transferDetails[1].assetId).toEqual(asset00.id);
    expect(transferDetails[1].delta).toEqual(100n);
    expect(transferDetails[1].isInput).toEqual(false);
  });

  it("can query pending transfers by recipient, asset and amount", async () => {
    const { multichain00, multichain01 } = await fetchBlockchains();

    const connection00 = createConnection(
      await createChromiaClientToMultichain(multichain00.rid),
    );

    const asset00 = await getNewAsset(
      connection00.client,
      "crosschain-pending-transfer-test-asset",
      "CROSSCHAIN-pending-transfer-test-asset",
    );

    const account00 = await AccountBuilder.account(connection00)
      .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
      .withBalance(asset00, createAmount(100, asset00.decimals))
      .build();

    const tx = await transactionBuilder(
      account00.authenticator,
      connection00.client,
    )
      .add(
        initTransfer(
          account00.id,
          asset00.id,
          createAmount(100, asset00.decimals),
          [multichain01.rid],
          Date.now() + days(1),
        ),
      )
      .build();

    await connection00.client.sendTransaction(tx);

    const transfer = await account00.getLastPendingCrosschainTransfer(
      multichain01.rid,
      account00.id,
      asset00.id,
      createAmount(100, asset00.decimals).value,
    );

    expect(transfer).toEqual({
      opIndex: 1,
      tx: gtv.decode(tx),
      accountId: account00.id,
    });
  });

  it("transfer fails if expired before init", async () => {
    const { multichain00, multichain01 } = await fetchBlockchains();

    const connection00 = createConnection(
      await createChromiaClientToMultichain(multichain00.rid),
    );

    const asset00 = await getNewAsset(
      connection00.client,
      "crosschain-transfer-expiry-test-asset",
      "CROSSCHAIN-transfer-expiry-test-asset",
    );

    const account00 = await AccountBuilder.account(connection00)
      .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
      .withBalance(asset00, createAmount(100, asset00.decimals))
      .build();

    const tb = transactionBuilder(account00.authenticator, connection00.client);

    const initOperation = initTransfer(
      Buffer.alloc(64),
      asset00.id,
      createAmount(100, asset00.decimals),
      [multichain01.rid],
      1,
    );

    const promise = tb.add(initOperation).buildAndSend();

    await expect(promise).rejects.toThrow(
      "Parameter 'deadline' cannot be a past timestamp. Value: 1",
    );
  });

  it("displays original sender id in transfer history", async () => {
    const { multichain00, multichain01 } = await fetchBlockchains();

    const connection00 = createConnection(
      await createChromiaClientToMultichain(multichain00.rid),
    );
    const connection01 = createConnection(
      await createChromiaClientToMultichain(multichain01.rid),
    );

    // Register asset on chain A
    const asset00 = await addNewAssetIfNeeded(
      connection00.client,
      "crosschain-transfer-original-sender-test-asset",
      "CROSSCHAIN-transfer-original-sender-test-asset",
    );

    // Register asset on chain B
    await registerCrosschainAsset(
      connection01.client,
      adminUser().signatureProvider,
      asset00.id,
      multichain00.rid,
    );

    // Cerate sender account on chain A
    const account00 = await AccountBuilder.account(connection00)
      .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
      .withBalance(asset00, createAmount(100, asset00.decimals))
      .build();

    // Transfer assets from A to B (no recipient account exists yet)
    await crosschainTransfer(
      connection00,
      account00.authenticator,
      connection01.blockchainRid,
      account00.id, // We will get the same account id on the target chain
      asset00.id,
      createAmount(10, asset00.decimals),
    );

    // Register the account by claiming the assets on chain B
    const { session: recipientSession } = await registerAccount(
      connection01.client,
      account00.authenticator.keyHandlers[0].keyStore as FtKeyStore,
      registrationStrategy.open(await account00.getMainAuthDescriptor()),
    );

    // Fetch transfer history entries for account on chain B
    const historyEntry = (await recipientSession.account.getTransferHistory())
      .data[0];
    const details = await getTransferDetailsByAsset(
      connection01,
      historyEntry.transactionId,
      historyEntry.opIndex,
      asset00.id,
    );
    const senderRecord = details.filter((d) => d.isInput)[0];

    expect(senderRecord.accountId).toEqual(account00.id);
    expect(senderRecord.blockchainRid).toEqual(connection00.blockchainRid);
  });

  describe("getCrosschainTransferHistoryEntriesFiltered", () => {
    const mockBuffer = Buffer.alloc(32);
    it("returns empty pagination without filter", async () => {
      const { multichain00 } = await fetchBlockchains();

      const client00 = await createChromiaClientToMultichain(multichain00.rid);
      const connection00 = createConnection(client00);

      const { data } =
        await connection00.getCrosschainTransferHistoryEntriesFiltered(null, 1);

      const foundCrosschainTransferHistoryEntry =
        data.find((item) => item.assetId === mockBuffer) ?? null;
      expect(foundCrosschainTransferHistoryEntry).toBe(null);
    });
    it("returns empty pagination with filter", async () => {
      const { multichain00 } = await fetchBlockchains();

      const client00 = await createChromiaClientToMultichain(multichain00.rid);
      const connection00 = createConnection(client00);
      const { data } =
        await connection00.getCrosschainTransferHistoryEntriesFiltered(
          setCrosschainAndTransferHistoryEntryFilter(
            [mockBuffer],
            [mockBuffer],
            [mockBuffer],
            0,
          ),
          1,
        );

      const foundCrosschainTransferHistoryEntry =
        data.find((item) => item.assetId === mockBuffer) ?? null;
      expect(foundCrosschainTransferHistoryEntry).toBe(null);
    });

    it("returns paginated crosschain transfer history entries without filter", async () => {
      const { multichain00, multichain01 } = await fetchBlockchains();

      const client00 = await createChromiaClientToMultichain(multichain00.rid);
      const connection00 = createConnection(client00);
      const connection01 = createConnection(
        await createChromiaClientToMultichain(multichain01.rid),
      );

      const asset00 = await getNewAsset(
        connection00.client,
        "crosschain-transfer-test-asset_2",
        "CROSSCHAIN-transfer-test-asset_2",
      );
      await registerCrosschainAsset(
        connection01.client,
        adminUser().signatureProvider,
        asset00.id,
        multichain00.rid,
      );

      const account00 = await AccountBuilder.account(connection00)
        .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
        .withBalance(asset00, createAmount(100, asset00.decimals))
        .build();

      const account01 = await AccountBuilder.account(connection01)
        .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
        .build();

      const tb = transactionBuilder(
        account00.authenticator,
        connection00.client,
      );

      const initOperation = initTransfer(
        account01.id,
        asset00.id,
        createAmount(100, asset00.decimals),
        [multichain01.rid],
        10000000000000,
      );

      await new Promise<void>((resolve, reject) => {
        const onAnchoredHandler = async (
          data: {
            operation: Operation;
            opIndex: number;
            tx: RawGtx;
            createProof: (blockchainRid: BufferId) => Promise<Operation>;
          } | null,
          error: Error | null,
        ) => {
          if (error) {
            reject(error);
            return;
          }
          if (!data) {
            reject(new Error("No data provided"));
            return;
          }
          const iccfProofOperation = await data.createProof(multichain01.rid);
          try {
            await transactionBuilder(
              account00.authenticator,
              connection01.client,
            )
              .add(iccfProofOperation, {
                authenticator: noopAuthenticator,
              })
              .add(
                applyTransfer(data.tx, data.opIndex, data.tx, data.opIndex, 0),
                { authenticator: noopAuthenticator },
              )
              .buildAndSend();
          } catch (error) {
            reject(error);
          }

          resolve();
        };

        tb.add(initOperation, {
          onAnchoredHandler,
        }).buildAndSendWithAnchoring();
      });

      const crosschainHistory = await account00.getTransferHistory();

      const { data } =
        await connection00.getCrosschainTransferHistoryEntriesFiltered(
          null,
          100,
        );

      const foundCrosschainTransferHistoryEntry = data.find((item) =>
        crosschainHistory.data.some(
          (element) =>
            element.transactionId.toString("hex") ===
            item.transactionId.toString("hex"),
        ),
      );

      expect(JSON.stringify(foundCrosschainTransferHistoryEntry)).toStrictEqual(
        JSON.stringify({
          blockchainRid: multichain00.rid,
          accountId: account00.id,
          assetId: asset00.id,
          delta: crosschainHistory.data[0].delta,
          isInput: crosschainHistory.data[0].isInput,
          opIndex: crosschainHistory.data[0].opIndex,
          transactionId: crosschainHistory.data[0].transactionId,
        }),
      );
    });
    it("returns paginated crosschain transfer history entries with filter", async () => {
      const { multichain00, multichain01 } = await fetchBlockchains();

      const client00 = await createChromiaClientToMultichain(multichain00.rid);
      const connection00 = createConnection(client00);
      const connection01 = createConnection(
        await createChromiaClientToMultichain(multichain01.rid),
      );

      const asset00 = await getNewAsset(
        connection00.client,
        "crosschain-transfer-test-asset_3",
        "CROSSCHAIN-transfer-test-asset_3",
      );
      await registerCrosschainAsset(
        connection01.client,
        adminUser().signatureProvider,
        asset00.id,
        multichain00.rid,
      );

      const account00 = await AccountBuilder.account(connection00)
        .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
        .withBalance(asset00, createAmount(100, asset00.decimals))
        .build();

      const account01 = await AccountBuilder.account(connection01)
        .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
        .build();

      const tb = transactionBuilder(
        account00.authenticator,
        connection00.client,
      );

      const initOperation = initTransfer(
        account01.id,
        asset00.id,
        createAmount(100, asset00.decimals),
        [multichain01.rid],
        10000000000000,
      );

      await new Promise<void>((resolve, reject) => {
        const onAnchoredHandler = async (
          data: {
            operation: Operation;
            opIndex: number;
            tx: RawGtx;
            createProof: (blockchainRid: BufferId) => Promise<Operation>;
          } | null,
          error: Error | null,
        ) => {
          if (error) {
            reject(error);
            return;
          }
          if (!data) {
            reject(new Error("No data provided"));
            return;
          }
          const iccfProofOperation = await data.createProof(multichain01.rid);
          try {
            await transactionBuilder(
              account00.authenticator,
              connection01.client,
            )
              .add(iccfProofOperation, {
                authenticator: noopAuthenticator,
              })
              .add(
                applyTransfer(data.tx, data.opIndex, data.tx, data.opIndex, 0),
                { authenticator: noopAuthenticator },
              )
              .buildAndSend();
          } catch (error) {
            reject(error);
          }

          resolve();
        };

        tb.add(initOperation, {
          onAnchoredHandler,
        }).buildAndSendWithAnchoring();
      });

      // const crosschainHistory =
      //   await account00.getCrosschainTransferHistoryEntriesFiltered();
      const crosschainHistory = await account00.getTransferHistory();

      const { data } =
        await connection00.getCrosschainTransferHistoryEntriesFiltered(
          setCrosschainAndTransferHistoryEntryFilter(
            [account00.id],
            [asset00.id],
            [crosschainHistory.data[0].transactionId],
            crosschainHistory.data[0].opIndex,
          ),
          100,
        );

      const foundCrosschainTransferHistoryEntry = data.find((item) =>
        crosschainHistory.data.some(
          (element) =>
            element.transactionId.toString("hex") ===
            item.transactionId.toString("hex"),
        ),
      );

      expect(JSON.stringify(foundCrosschainTransferHistoryEntry)).toStrictEqual(
        JSON.stringify({
          blockchainRid: multichain00,
          accountId: account00.id,
          assetId: asset00.id,
          delta: crosschainHistory.data[0].delta,
          isInput: crosschainHistory.data[0].isInput,
          opIndex: crosschainHistory.data[0].opIndex,
          transactionId: crosschainHistory.data[0].transactionId,
        }),
      );
    });
  });
});
