import {
  AccountBuilder,
  adminUser,
  createChromiaClientToMultichain,
  fetchBlockchains,
  getNewAsset,
  emptyOp,
} from "@ft4-test/util";
import { AuthFlag, AuthenticatedAccount } from "@ft4/accounts";
import { mint, registerCrosschainAsset } from "@ft4/admin";
import { Asset, createAmount } from "@ft4/asset";
import {
  applyTransfer,
  findPathToChainForAsset,
  initTransfer,
} from "@ft4/crosschain";
import {
  Connection,
  Session,
  createConnection,
  createSession,
} from "@ft4/ft-session";
import { Buffer } from "buffer";
import { setupTestEnvironment } from "./common-setup";
import { transactionBuilder } from "@ft4/transaction-builder";
import { noopAuthenticator } from "@ft4/authentication/index";
import { nop } from "@ft4/utils/index";

describe("Orchestrator", () => {
  let connection0: Connection, connection2: Connection;
  let account0: AuthenticatedAccount, account2: AuthenticatedAccount;
  let session0: Session;
  let asset: Asset;
  let multichain2Rid: Buffer;

  const mintAmount = createAmount(100, 0);
  const transferAmount = createAmount(10, 0);

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
      "revert_transfer" + counter,
      "REVERT_TRANSFER" + counter,
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
      mintAmount,
    );

    multichain2Rid = multichain02.rid;
  });

  it("reverts a transfer that was initiated but not completed", async () => {
    const path = await findPathToChainForAsset(session0, asset, multichain2Rid);
    await session0
      .transactionBuilder()
      .add(
        initTransfer(account2.id, asset.id, transferAmount, path, Date.now()),
      )
      .buildAndSendWithAnchoring();

    // Force block building to get past deadline
    await createSession(connection2, account2.authenticator)
      .transactionBuilder()
      .add(emptyOp(), { authenticator: noopAuthenticator })
      .add(nop(), { authenticator: noopAuthenticator })
      .buildAndSend();

    const pendingTransfers = await account0.getPendingCrosschainTransfers();
    await account0.revertCrosschainTransfer(pendingTransfers.data[0]);

    const balance0 = await account0.getBalanceByAssetId(asset.id);
    expect(balance0!.amount.value).toStrictEqual(mintAmount.value);

    const balance2 = await account2.getBalanceByAssetId(asset.id);
    expect(balance2).toBeNull();

    expect((await account0.getPendingCrosschainTransfers()).data).toHaveLength(
      0,
    );
  });

  it("reverts a transfer that was applied to intermediary but not completed", async () => {
    const testContext = await setupTestEnvironment(
      "revert-transfer",
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
          transferAmount,
          path,
          Date.now() + 1000, // Potentially might need to update to 5000 or 10000 in order for the pipeline to work
        ),
      )
      .buildAndSendWithAnchoring()
      .then((data) => {
        state.tx = data.tx;
        state.initialOpIndex = 1;
        state.initialTx = data.tx;
        state.opIndex = 1;
        state.proof = data.systemConfirmationProof(path[0]);
      });

    state.proof = await state.proof;

    // Perform apply transfer on intermediary
    await transactionBuilder(noopAuthenticator, testContext.connection2.client)
      .add(state.proof)
      .add(
        applyTransfer(
          state.initialTx!,
          state.initialOpIndex!,
          state.tx!,
          state.opIndex!,
          0,
        ),
      )
      .buildAndSendWithAnchoring();

    // Force block building to get past deadline
    await testContext.session1
      .transactionBuilder()
      .add(emptyOp(), { authenticator: noopAuthenticator })
      .add(nop(), { authenticator: noopAuthenticator })
      .buildAndSend();

    const pendingTransfers =
      await testContext.account0.getPendingCrosschainTransfers();

    await testContext.account0.revertCrosschainTransfer(
      pendingTransfers.data[0],
    );

    const balance0 = await account0.getBalanceByAssetId(asset.id);
    expect(balance0!.amount.value).toEqual(mintAmount.value);

    const balance1 = await testContext.account1.getBalanceByAssetId(
      testContext.sampleAsset.id,
    );
    expect(balance1).toBeNull();

    expect(
      (await testContext.account0.getPendingCrosschainTransfers()).data,
    ).toHaveLength(0);
  });
});
