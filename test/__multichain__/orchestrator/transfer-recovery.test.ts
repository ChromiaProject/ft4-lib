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
import { formatter } from "postchain-client";

describe("Orchestrator", () => {
  let connection0: Connection, connection2: Connection;
  let account0: AuthenticatedAccount, account2: AuthenticatedAccount;
  let session0: Session;
  let asset: Asset;
  let multichain2Rid: Buffer;

  const amount = createAmount(10, 1);
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
      asset,
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
    const normalizedPath = path.map(formatter.ensureBuffer);
    const amount = createAmount(10);
    await session0
      .transactionBuilder()
      .add(
        initTransfer(
          account2.id,
          asset.id,
          amount,
          normalizedPath,
          10000000000000,
        ),
      )
      .buildAndSendWithAnchoring();

    const pendingTransfers = await account0.getPendingCrosschainTransfers();
    await session0.account.resumeCrosschainTransfer(pendingTransfers.data[0]);

    const balance = await account2.getBalanceByAssetId(asset.id);
    Object.assign(BigInt.prototype, {
      toJSON: function () {
        return this.toString();
      },
    });
    expect(JSON.stringify(balance)).toStrictEqual(
      JSON.stringify({ asset, amount }),
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
