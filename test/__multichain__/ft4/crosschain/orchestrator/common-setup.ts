import { fetchBlockchains } from "/__multichain__/util/blockchain";
import {
  FlagsType,
  createAmount,
  createConnection,
  mint,
  registerCrosschainAsset,
} from "/ft4";
import {
  createChromiaClientToMultichain,
  getNewAsset,
} from "/util/blockchain-util";
import adminUser from "/util/admin_user";
import AccountBuilder from "/util/account-builder";
import { createSession } from "/ft4/ft-session";
import { Connection, Session } from "/ft4/types";
import { Asset } from "/ft4/asset/types";
import { AuthenticatedAccount } from "/ft4/accounts";

export type TestContext = {
  connection0: Connection;
  connection2: Connection;
  account0: AuthenticatedAccount;
  account2: AuthenticatedAccount;
  session0: Session;
  asset: Asset;
  multichain0Rid: Buffer;
  multichain2Rid: Buffer;
};

export async function setupTestEnvironment() {
  const { multichain00, multichain02 } = await fetchBlockchains();

  const connection0 = createConnection(
    await createChromiaClientToMultichain(multichain00.rid),
  );
  const connection2 = createConnection(
    await createChromiaClientToMultichain(multichain02.rid),
  );

  const asset = await getNewAsset(connection0.client);
  await registerCrosschainAsset(
    connection2.client,
    adminUser().signatureProvider,
    asset,
    multichain00.rid,
  );

  const account0 = await AccountBuilder.account(connection0)
    .withAuthFlags(FlagsType.Account, FlagsType.Transfer)
    .build();

  const account2 = await AccountBuilder.account(connection2)
    .withAuthFlags(FlagsType.Account, FlagsType.Transfer)
    .build();

  const session0 = createSession(connection0, account0.authenticator);

  await mint(
    connection0.client,
    adminUser().signatureProvider,
    account0.id,
    asset.id,
    createAmount(100, asset.decimals),
  );

  const multichain0Rid = multichain00.rid;
  const multichain2Rid = multichain02.rid;

  const testContext: TestContext = {
    connection0,
    connection2,
    account0,
    account2,
    session0,
    asset,
    multichain0Rid,
    multichain2Rid,
  };

  return testContext;
}
