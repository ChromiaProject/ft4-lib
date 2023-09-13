import { fetchBlockchains } from "/__multichain__/util/blockchain";
import {
  FlagsType,
  createAmount,
  createConnection,
  mint,
  registerCrosschainAsset,
} from "/ft4";
import { createOrchestrator } from "/ft4/crosschain/orchestrator";
import { Connection, Session } from "/ft4/types";
import {
  createChromiaClientToMultichain,
  getNewAsset,
} from "/util/blockchain-util";
import { Asset } from "/ft4/asset/types";
import adminUser from "/util/admin_user";
import AccountBuilder from "/util/account-builder";
import { createSession } from "/ft4/ft-session";
import { AuthenticatedAccount } from "/ft4/accounts";

describe("Orchestrator", () => {
  let connection0: Connection, connection2: Connection;
  let account0: AuthenticatedAccount, account2: AuthenticatedAccount;
  let session0: Session;
  let asset: Asset;
  let multichain0Rid: Buffer, multichain2Rid: Buffer;

  const amount = createAmount(10, 1);

  beforeEach(async () => {
    const { multichain00, multichain02 } = await fetchBlockchains();

    connection0 = createConnection(
      await createChromiaClientToMultichain(multichain00.rid),
    );
    connection2 = createConnection(
      await createChromiaClientToMultichain(multichain02.rid),
    );

    asset = await getNewAsset(connection0.client);
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

    multichain0Rid = multichain00.rid;
    multichain2Rid = multichain02.rid;
  });

  it("executes transfer through all paths", async () => {
    const orchestrator = await createOrchestrator(
      multichain2Rid,
      account2.id,
      amount,
      asset.id,
      session0,
    );

    const initListener = jest.fn();
    const hopListener = jest.fn();
    const endListener = jest.fn();
    const errorListener = jest.fn();

    orchestrator.onTransferInit(initListener);
    orchestrator.onTransferHop(hopListener);
    orchestrator.onTransferEnd(endListener);
    orchestrator.onTransferError(errorListener);

    await orchestrator.transfer();

    expect(initListener).toHaveBeenCalled();
    expect(hopListener).toHaveBeenCalledTimes(2);
    expect(endListener).toHaveBeenCalled();
    expect(errorListener).not.toHaveBeenCalled();
  });

  it("emits error event on transfer failure", async () => {
    const mockSession = {
      ...createSession(connection2, account2.authenticator),
      transactionBuilder: jest.fn().mockImplementation(() => {
        throw new Error("Mocked Error");
      }),
    };

    const orchestrator = await createOrchestrator(
      multichain0Rid,
      account0.id,
      amount,
      asset.id,
      mockSession,
    );
    const errorListener = jest.fn();

    orchestrator.onTransferError(errorListener);

    await orchestrator.transfer();

    expect(errorListener).toHaveBeenCalled();
  });
});
