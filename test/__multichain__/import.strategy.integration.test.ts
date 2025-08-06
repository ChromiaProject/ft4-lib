import {
  AccountBuilder,
  createChromiaClientToMultichain,
  fetchBlockchains,
  getAccountIdFromAuthDescriptor,
} from "@ft4-test/util";
import {
  AuthFlag,
  createSingleSigAuthDescriptorRegistration,
  getAccountMainAuthDescriptor,
} from "@ft4/accounts";

import { createInMemoryFtKeyStore } from "@ft4/authentication";
import { createConnection } from "@ft4/ft-session";
import {
  registerAccount,
  registrationStrategy,
  verifyAccount,
} from "@ft4/registration";
import { transactionBuilder } from "@ft4/transaction-builder";
import { MERKLE_HASH_VERSIONS, newSignatureProvider } from "postchain-client";

describe("import strategy account creation single step", () => {
  beforeAll(async () => {});

  it("can register account if registered on another trusted chain", async () => {
    const sigProv = newSignatureProvider(MERKLE_HASH_VERSIONS.ONE);
    const keyStore = createInMemoryFtKeyStore(sigProv);
    const authDescriptor = createSingleSigAuthDescriptorRegistration(
      [AuthFlag.Account, AuthFlag.Transfer],
      keyStore.id,
    );
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

    // Create the transaction with ft_auth and verify_account operations on origin chain
    const originTransaction = await transactionBuilder(
      account00.authenticator,
      connection00.client,
    )
      .add(verifyAccount())
      .buildAndSendWithAnchoring();

    // Create ICCF proof operation from the origin transaction
    const iccfProofOperation = await originTransaction.systemConfirmationProof(
      multichain00.rid,
    );

    const iccfProofTransaction = await transactionBuilder(
      account00.authenticator,
      connection00.client,
    )
      .add(iccfProofOperation)
      .buildAndSendWithAnchoring();

    // Create import strategy and register account on destination chain
    const importStrategy = registrationStrategy.importStrategy(
      multichain01.rid,
      iccfProofTransaction.tx,
      authDescriptor,
    );

    const registeredAccount = await registerAccount(
      connection01.client,
      keyStore,
      importStrategy,
    );

    // Verify the account has been successfully created on the destination chain
    const expectedAccountId = getAccountIdFromAuthDescriptor(authDescriptor);

    // Verify the session is valid and the account ID matches
    expect(registeredAccount.session.account.id).toEqual(expectedAccountId);

    // Verify the account exists and has the correct main auth descriptor
    const mainAuthDescriptor = await getAccountMainAuthDescriptor(
      connection01,
      expectedAccountId,
    );
    // expect(mainAuthDescriptor.id).toEqual(authDescriptor.id);
    expect(mainAuthDescriptor.args.flags).toEqual([
      AuthFlag.Account,
      AuthFlag.Transfer,
    ]);
  });
});
