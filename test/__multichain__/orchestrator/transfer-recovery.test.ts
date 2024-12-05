import {
  AccountBuilder,
  adminUser,
  createChromiaClientToMultichain,
  fetchBlockchains,
  getNewAsset,
} from "@ft4-test/util";
import { AuthFlag, AuthenticatedAccount } from "@ft4/accounts";
import { mint, registerCrosschainAsset } from "@ft4/admin";
import { Asset, createAmount } from "@ft4/asset";
import {
  PendingTransfer,
  applyTransfer,
  createOrchestrator,
  findPathToChainForAsset,
  initTransfer,
} from "@ft4/crosschain";
import {
  Connection,
  Session,
  createConnection,
  createSession,
} from "@ft4/ft-session";
import { PaginatedEntity } from "@ft4/utils";
import { Buffer } from "buffer";
import { setupTestEnvironment } from "./common-setup";
import {
  OnAnchoredHandlerData,
  transactionBuilder,
} from "@ft4/transaction-builder";
import { noopAuthenticator } from "@ft4/authentication";

describe("Orchestrator", () => {
  let connection0: Connection, connection2: Connection;
  let account0: AuthenticatedAccount, account2: AuthenticatedAccount;
  let session0: Session;
  let asset: Asset;
  let multichain2Rid: Buffer;

  const amount = createAmount(10, 0);
  let counter = 0;

  beforeEach(async () => {
    const { multichain00, multichain02 } = await fetchBlockchains();

    connection0 = createConnection(
      await createChromiaClientToMultichain(multichain00.rid),
    );
    connection2 = createConnection(
      await createChromiaClientToMultichain(multichain02.rid),
    );

    asset = await getNewAsset(
      connection0.client,
      "transfer_recovery" + counter,
      "TRANSFER_RECOVERY" + counter,
    );
    counter++;
    await registerCrosschainAsset(
      connection2.client,
      adminUser().signatureProvider,
      asset.id,
      multichain00.rid,
    );

    account0 = await AccountBuilder.account(connection0)
      .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
      .build();

    account2 = await AccountBuilder.account(connection2)
      .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
      .build();

    session0 = createSession(connection0, account0.authenticator);

    await mint(
      connection0.client,
      adminUser().signatureProvider,
      account0.id,
      asset.id,
      createAmount(100, asset.decimals),
    );

    multichain2Rid = multichain02.rid;
  });

  it("resumes a transfer that was initiated but not completed", async () => {
    const path = await findPathToChainForAsset(session0, asset, multichain2Rid);
    const amount = createAmount(10, 0);
    await session0
      .transactionBuilder()
      .add(initTransfer(account2.id, asset.id, amount, path, 10000000000000))
      .buildAndSendWithAnchoring();

    const pendingTransfers = await account0.getPendingCrosschainTransfers();
    await account0.resumeCrosschainTransfer(pendingTransfers.data[0]);

    const balance = await account2.getBalanceByAssetId(asset.id);
    expect(JSON.stringify(balance)).toStrictEqual(
      JSON.stringify({ rowId: balance!.rowId, asset, amount }),
    );
  });

  it("resumes a transfer that was applied to intermediary but not completed", async () => {
    const mintAmount = createAmount(100, 0);
    const testContext = await setupTestEnvironment(
      "transfer-recovery",
      mintAmount,
    );

    // Register a crosschain asset
    await registerCrosschainAsset(
      testContext.connection1.client, // Leaf
      adminUser().signatureProvider,
      testContext.sampleAsset.id,
      testContext.multichain2.rid, // Branch
    );

    // Submit init transfer on source chain
    const path = await findPathToChainForAsset(
      testContext.session0,
      testContext.sampleAsset,
      testContext.multichain1.rid,
    );
    const state = {} as any;
    await testContext.session0
      .transactionBuilder()
      .add(
        initTransfer(
          testContext.account1.id,
          testContext.sampleAsset.id,
          amount,
          path,
          10000000000000,
        ),
        {
          targetBlockchainRid: path[0],
          onAnchoredHandler: (data: OnAnchoredHandlerData | null) => {
            state.tx = data?.tx;
            state.initialOpIndex = data?.opIndex;
            state.initialTx = data?.tx;
            state.opIndex = data?.opIndex;
            state.proof = data?.createProof(path[0]);
          },
        },
      )
      .buildAndSendWithAnchoring();

    state.proof = await state.proof;

    // Perform apply transfer on intermediary
    await transactionBuilder(
      testContext.account0.authenticator,
      testContext.connection2.client,
    )
      .add(state.proof, { authenticator: noopAuthenticator })
      .add(
        applyTransfer(
          state.initialTx!,
          state.initialOpIndex!,
          state.tx!,
          state.opIndex!,
          0,
        ),
        {
          authenticator: noopAuthenticator,
          targetBlockchainRid: connection0.blockchainRid,
          onAnchoredHandler: () => {},
        },
      )
      .buildAndSendWithAnchoring();

    // Use Orchestrator to recover the transfer
    const pendingTransfers =
      await testContext.account0.getPendingCrosschainTransfers();
    await testContext.account0.resumeCrosschainTransfer(
      pendingTransfers.data[0],
    );

    // Assert that transfer were completed
    const balance = await testContext.account1.getBalanceByAssetId(
      testContext.sampleAsset.id,
    );
    const asset = await testContext.connection1.getAssetById(
      testContext.sampleAsset.id,
    );

    expect(JSON.stringify(balance)).toStrictEqual(
      JSON.stringify({
        rowId: balance!.rowId,
        asset,
        amount,
      }),
    );
  });

  it("removes pending transfer once transfer is completed", async () => {
    const orchestrator = await createOrchestrator(
      session0,
      session0.account.authenticator,
      multichain2Rid,
      account2.id,
      asset.id,
      amount,
    );

    const pendingTransfers = new Promise<PaginatedEntity<PendingTransfer>>(
      (resolve) => {
        orchestrator.onTransferInit(() => {
          resolve(account0.getPendingCrosschainTransfers());
        });
      },
    );

    await orchestrator.transfer();
    const pagination = await pendingTransfers;
    expect(pagination.data.length).toBe(1);
    const res = await account0.getPendingCrosschainTransfers();
    expect(res.data.length).toBe(0);
  });
});
