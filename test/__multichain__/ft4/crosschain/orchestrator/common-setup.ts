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
import { Blockchain } from "/__multichain__/util/types";
import { Amount } from "/ft4/asset/interfaces";

// This is needed to allow to check whether transaction is anchored
jest.unmock("postchain-client");

export type TestContext = {
  connection0: Connection;
  connection1: Connection;
  connection2: Connection;
  account0: AuthenticatedAccount;
  account1: AuthenticatedAccount;
  account2: AuthenticatedAccount;
  session0: Session;
  session1: Session;
  session2: Session;
  multichain0: Blockchain;
  multichain1: Blockchain;
  multichain2: Blockchain;
  sampleAsset: Asset;
  sampleAmount: Amount;
};

export async function setupTestEnvironment() {
  const { multichain00, multichain01, multichain02 } = await fetchBlockchains();

  const connection0 = createConnection(
    await createChromiaClientToMultichain(multichain00.rid),
  );
  const connection1 = createConnection(
    await createChromiaClientToMultichain(multichain01.rid),
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

  const account1 = await AccountBuilder.account(connection1)
    .withAuthFlags(FlagsType.Account, FlagsType.Transfer)
    .build();

  const account2 = await AccountBuilder.account(connection2)
    .withAuthFlags(FlagsType.Account, FlagsType.Transfer)
    .build();

  const session0 = createSession(connection0, account0.authenticator);
  const session1 = createSession(connection1, account1.authenticator);
  const session2 = createSession(connection2, account2.authenticator);

  await mint(
    connection0.client,
    adminUser().signatureProvider,
    account0.id,
    asset.id,
    createAmount(100, asset.decimals),
  );

  const testContext: TestContext = {
    connection0,
    connection1,
    connection2,
    account0,
    account1,
    account2,
    session0,
    session1,
    session2,
    multichain0: multichain00,
    multichain1: multichain01,
    multichain2: multichain02,
    sampleAsset: asset,
    sampleAmount: createAmount(10, 1),
  };

  return testContext;
}
