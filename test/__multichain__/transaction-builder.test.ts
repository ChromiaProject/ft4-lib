import {
  AccountBuilder,
  anchoredHandlerCallbackParameters,
  createChromiaClientToMultichain,
  emptyOp,
  fetchBlockchains,
} from "@ft4-test/util";
import { AuthFlag, AuthenticatedAccount } from "@ft4/accounts";
import { ftAuth } from "@ft4/authentication";
import { Connection, createConnection } from "@ft4/ft-session";
import { transactionBuilder } from "@ft4/transaction-builder";
import { nop } from "@ft4/utils";
import { gtx, SignedTransaction, TransactionReceipt } from "postchain-client";

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

  it("returns correct data when block is anchored in system anchoring chain", async () => {
    const operation = nop();

    let builtEvent: SignedTransaction | undefined = undefined;
    let sentEvent: Buffer | undefined = undefined;
    let confirmedEvent: TransactionReceipt | undefined = undefined;
    const data = await transactionBuilder(
      account00.authenticator,
      connection00.client,
    )
      .add(emptyOp())
      .add(operation)
      .buildAndSendWithAnchoring()
      .on("built", (tx) => {
        builtEvent = tx;
      })
      .on("sent", (txRid) => {
        sentEvent = txRid;
      })
      .on("confirmed", (receipt) => {
        confirmedEvent = receipt;
      });

    expect(builtEvent!.equals(gtx.serialize(data.tx)));
    expect(sentEvent!.equals(data.receipt.transactionRid));
    expect(confirmedEvent!.transactionRid.equals(data.receipt.transactionRid));

    const authDescriptorId = (await account00.getAuthDescriptors())[0].id;

    expect(data).toMatchObject(
      anchoredHandlerCallbackParameters(connection00.client, [
        ftAuth(account00.id, authDescriptorId),
        emptyOp(),
        operation,
      ]),
    );
  });
});
