import { nop } from "@ft4/utils";
import { transactionBuilder } from "@ft4/utils/transaction-builder";
import { emptyOp } from "../util/util";
import { AuthFlag } from "@ft4/index";
import { fetchBlockchains } from "./util/blockchain";
import { anchoredHandlerCallbackParameters } from "../util/blockchain-util";
import AccountBuilder from "@ft4/util/account-builder";
import { createConnection } from "@ft4/index";
import { createChromiaClientToMultichain } from "../util/blockchain-util";
import { Connection } from "@ft4/index";
import { AuthenticatedAccount } from "@ft4/accounts/index";
import { ftAuth } from "@ft4/authentication/index";

describe("transaction builder", () => {
  let connection00: Connection;
  let account00: AuthenticatedAccount;

  beforeEach(async () => {
    const { multichain00 } = await fetchBlockchains();

    connection00 = createConnection(
      await createChromiaClientToMultichain(multichain00.rid),
    );

    account00 = await AccountBuilder.account(connection00)
      .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
      .build();
  });

  it("calls registered handler when block is anchored in system anchoring chain", async () => {
    const callback: jest.Mock<any, any, any> = jest.fn();
    const operation = nop();

    await transactionBuilder(account00.authenticator, connection00.client)
      .add(emptyOp(), callback)
      .add(operation)
      .buildAndSendWithAnchoring();

    const authDescriptorId = (await account00.getAuthDescriptors())[0].id;
    expect(callback).toHaveBeenCalledWith(
      anchoredHandlerCallbackParameters(
        connection00.client,
        [ftAuth(account00.id, authDescriptorId), emptyOp(), operation],
        0,
        1,
      ),
      null,
    );
  });
});
