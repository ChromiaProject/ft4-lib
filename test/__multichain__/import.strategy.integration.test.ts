import {
  AccountBuilder,
  createChromiaClientToMultichain,
  fetchBlockchains,
} from "@ft4-test/util";
import { AuthFlag, getAccountMainAuthDescriptor } from "@ft4/accounts";

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
});
