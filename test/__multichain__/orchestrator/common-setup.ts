import {
  AccountBuilder,
  Blockchain,
  adminUser,
  createChromiaClientToMultichain,
  fetchBlockchains,
  getNewAsset,
  numberGenerator,
} from "@ft4-test/util";
import { AuthFlag, AuthenticatedAccount } from "@ft4/accounts";
import { mint, registerCrosschainAsset } from "@ft4/admin";
import { Amount, Asset, createAmount } from "@ft4/asset";
import {
  Connection,
  Session,
  createConnection,
  createSession,
} from "@ft4/ft-session";

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
};

const gen = numberGenerator();

export async function setupTestEnvironment(
  testName: string,
  mintAmount?: Amount,
) {
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

  const num = gen.next().value;

  const asset = await getNewAsset(
    connection0.client,
    "orchestrator-test-" + testName + "-asset" + num,
    "ORCHESTRATOR-test-" + testName + "-asset" + num,
  );
  await registerCrosschainAsset(
    connection2.client,
    adminUser().signatureProvider,
    asset,
    multichain00.rid,
  );

  const account0 = await AccountBuilder.account(connection0)
    .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
    .build();

  const account1 = await AccountBuilder.account(connection1)
    .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
    .build();

  const account2 = await AccountBuilder.account(connection2)
    .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
    .build();

  const session0 = createSession(connection0, account0.authenticator);
  const session1 = createSession(connection1, account1.authenticator);
  const session2 = createSession(connection2, account2.authenticator);

  const amountToMint = mintAmount ?? createAmount(100, asset.decimals);

  await mint(
    connection0.client,
    adminUser().signatureProvider,
    account0.id,
    asset.id,
    amountToMint,
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
  };

  return testContext;
}
