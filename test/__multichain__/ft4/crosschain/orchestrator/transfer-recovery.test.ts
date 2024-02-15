import { fetchBlockchains } from "../../../util/blockchain";
import {
  FlagsType,
  createAmount,
  createConnection,
  mint,
  registerCrosschainAsset,
} from "@ft4/index";
import { AuthenticatedAccount } from "@ft4/accounts";
import { Asset } from "@ft4/asset/types";
import { PendingTransfer, findPathToChainForAsset } from "@ft4/crosschain";
import {
  createOrchestrator,
  createResumeOrchestrator,
} from "@ft4/crosschain/orchestrator";
import { createSession } from "@ft4/ft-session";
import { Connection, Session } from "@ft4/types";
import { PaginatedEntity } from "@ft4/utils/types";
import AccountBuilder from "../../../../util/account-builder";
import adminUser from "../../../../util/admin_user";
import {
  createChromiaClientToMultichain,
  getNewAsset,
} from "../../../../util/blockchain-util";
import { initTransfer } from "@ft4/crosschain/operations";
import { formatter } from "postchain-client";

jest.unmock("postchain-client");

describe("Orchestrator", () => {
  let connection0: Connection, connection2: Connection;
  let account0: AuthenticatedAccount, account2: AuthenticatedAccount;
  let session0: Session;
  let asset: Asset;
  let multichain2Rid: Buffer;

  const amount = createAmount(10, 1);

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
      "transfer_recovery",
      "TRANSFER_RECOVERY",
    );
    await registerCrosschainAsset(
      connection2.client,
      adminUser().signatureProvider,
      asset,
      multichain00.rid,
    );

    account0 = await AccountBuilder.account(connection0)
      .withAuthFlags(FlagsType.Account, FlagsType.Transfer)
      .build();

    account2 = await AccountBuilder.account(connection2)
      .withAuthFlags(FlagsType.Account, FlagsType.Transfer)
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
    const promise = new Promise<void>((resolve) => {
      session0
        .transactionBuilder()
        .add(
          initTransfer(account2.id, asset.id, amount, normalizedPath),
          () => {
            resolve();
          },
        )
        .buildAndSend();
    });

    await promise;
    const pendingTransfers = await account0.getPendingCrosschainTransfers();
    const orchestrator = await createResumeOrchestrator(
      session0,
      pendingTransfers.data[0],
    );

    await orchestrator.resumeTransfer();
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
      multichain2Rid,
      account2.id,
      asset.id,
      amount,
      session0,
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
