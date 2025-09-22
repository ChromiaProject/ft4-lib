import {
  AccountBuilder,
  createChromiaClientToMultichain,
  addNewAssetIfNeeded,
  fetchBlockchains,
} from "@ft4-test/util";
import {
  AuthFlag,
  createSingleSigAuthDescriptorRegistration,
  getAccountMainAuthDescriptor,
  transfer,
} from "@ft4/accounts";
import { Amount, Asset, createAmount } from "@ft4/asset";

import { FtKeyStore } from "@ft4/authentication";
import { createConnection } from "@ft4/ft-session";
import { registerAccount, registrationStrategy } from "@ft4/registration";
import { transactionBuilder } from "@ft4/transaction-builder";

describe("import strategy account creation single step", () => {
  beforeAll(async () => {});

  it("can register account if registered on another trusted chain", async () => {
    const { multichain00, multichain01 } = await fetchBlockchains();

    const connection00 = createConnection(
      await createChromiaClientToMultichain(multichain00.rid),
    );
    const connection01 = createConnection(
      await createChromiaClientToMultichain(multichain01.rid),
    );

    const account00 = await AccountBuilder.account(connection00)
      .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
      .build();

    const mainAuthDescriptor00 = await account00.getMainAuthDescriptor();
    // Create import strategy and register account on destination chain
    const importStrategy = registrationStrategy.importStrategy(
      multichain00.rid,
      mainAuthDescriptor00,
    );

    const registeredAccount01 = await registerAccount(
      connection01.client,
      account00.authenticator.keyHandlers[0].keyStore as FtKeyStore,
      importStrategy,
    );

    expect(registeredAccount01.session.account.id).toEqual(account00.id);

    // Verify the account exists and has the correct main auth descriptor
    const mainAuthDescriptor01 = await getAccountMainAuthDescriptor(
      connection01,
      account00.id,
    );

    expect(mainAuthDescriptor01.id).toEqual(mainAuthDescriptor00.id);

    expect(mainAuthDescriptor01.args.flags).toEqual([
      AuthFlag.Account,
      AuthFlag.Transfer,
    ]);
  });

  it("can register account if registered on another trusted chain with different flags", async () => {
    const { multichain00, multichain01 } = await fetchBlockchains();

    const connection00 = createConnection(
      await createChromiaClientToMultichain(multichain00.rid),
    );
    const connection01 = createConnection(
      await createChromiaClientToMultichain(multichain01.rid),
    );

    const account00 = await AccountBuilder.account(connection00)
      .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer, "X")
      .build();

    expect((await account00.getMainAuthDescriptor()).args.flags).toEqual([
      AuthFlag.Account,
      AuthFlag.Transfer,
      "X",
    ]);

    const mainAuthDescriptor = createSingleSigAuthDescriptorRegistration(
      [AuthFlag.Account, AuthFlag.Transfer],
      account00.authenticator.keyHandlers[0].keyStore.id,
    );
    // Create import strategy and register account on destination chain
    const importStrategy = registrationStrategy.importStrategy(
      multichain00.rid,
      mainAuthDescriptor,
    );

    const registeredAccount01 = await registerAccount(
      connection01.client,
      account00.authenticator.keyHandlers[0].keyStore as FtKeyStore,
      importStrategy,
    );

    expect(registeredAccount01.session.account.id).toEqual(account00.id);

    // Verify the account exists and has the correct main auth descriptor
    const mainAuthDescriptor01 = await getAccountMainAuthDescriptor(
      connection01,
      account00.id,
    );

    expect(mainAuthDescriptor01.args.flags).toEqual([
      AuthFlag.Account,
      AuthFlag.Transfer,
    ]);
  });

  it("can register account without signature from chain 2 if it has a recent enough transaction on chain 0", async () => {
    const { multichain00, multichain02 } = await fetchBlockchains();

    const connection00 = createConnection(
      await createChromiaClientToMultichain(multichain00.rid),
    );
    const connection02 = createConnection(
      await createChromiaClientToMultichain(multichain02.rid),
    );

    const asset: Asset = await addNewAssetIfNeeded(
      connection00.client,
      "import_strategy_asset",
      "IMPORT_STRATEGY_ASSET",
      5,
    );

    const defaultAmount: Amount = createAmount(10, asset.decimals);

    const originAccount00 = await AccountBuilder.account(connection00)
      .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
      .withBalance(asset, 100)
      .build();

    const originAccount01 = await AccountBuilder.account(connection00)
      .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
      .build();

    const mainAuthDescriptor = await originAccount00.getMainAuthDescriptor();

    // await originAccount00.transfer(originAccount01.id, asset.id, defaultAmount);
    // await originAccount00.transfer(originAccount01.id, asset.id, defaultAmount);
    const txbuilder = transactionBuilder(
      originAccount00.authenticator,
      connection00.client,
    );
    txbuilder.add(transfer(originAccount01.id, asset.id, defaultAmount));

    await txbuilder.buildAndSendWithAnchoring();

    const importStrategy = registrationStrategy.importStrategy(
      multichain00.rid,
      mainAuthDescriptor,
      null,
      {
        forceSignature: false,
      },
    );
    const registeredAccount02 = await registerAccount(
      connection02.client,
      originAccount00.authenticator.keyHandlers[0].keyStore as FtKeyStore,
      importStrategy,
    );

    expect(registeredAccount02.session.account.id).toEqual(originAccount00.id);

    // Verify the account exists and has the correct main auth descriptor
    const mainAuthDescriptor02 = await getAccountMainAuthDescriptor(
      connection02,
      originAccount00.id,
    );

    expect(mainAuthDescriptor02.args.flags).toEqual([
      AuthFlag.Account,
      AuthFlag.Transfer,
    ]);
  });

  // TODO test that it can require a signature from chain 2 if it has no recent enough transaction on chain 0
});
