import {
  AccountBuilder,
  createChromiaClientToMultichain,
  fetchBlockchains,
} from "@ft4-test/util";
import {
  AuthFlag,
  createSingleSigAuthDescriptorRegistration,
  getAccountMainAuthDescriptor,
} from "@ft4/accounts";

import { FtKeyStore } from "@ft4/authentication";
import { createConnection } from "@ft4/ft-session";
import { registerAccount, registrationStrategy } from "@ft4/registration";

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
    // Create 2 acocunts on chain 0
    // make a transfer on chain 0
    // register the sender on chain 2, it should not require a signature
  });

  // TODO test that it can require a signature from chain 2 if it has a recent enough transaction on chain 0
});
