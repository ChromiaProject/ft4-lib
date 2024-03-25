import { nop } from "@ft4/utils";
import { transactionBuilder } from "@ft4/transaction-builder";
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
import { SignedTransaction, TransactionReceipt } from "postchain-client";

describe("transaction builder", () => {
  let connection00: Connection;
  let account00: AuthenticatedAccount;
  let rid01: Buffer;

  beforeEach(async () => {
    const { multichain00, multichain01 } = await fetchBlockchains();

    connection00 = createConnection(
      await createChromiaClientToMultichain(multichain00.rid),
    );

    account00 = await AccountBuilder.account(connection00)
      .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
      .build();

    rid01 = multichain01.rid;
  });

  it("calls registered handler when block is anchored in system anchoring chain", async () => {
    const callback: jest.Mock<any, any, any> = jest.fn();
    const callback2: jest.Mock<any, any, any> = jest.fn();
    const operation = nop();

    let builtEvent: SignedTransaction | undefined = undefined;
    let sentEvent: Buffer | undefined = undefined;
    let confirmedEvent: TransactionReceipt | undefined = undefined;
    const { tx, receipt } = await transactionBuilder(
      account00.authenticator,
      connection00.client,
    )
      .add(emptyOp(), callback)
      .addWithAnchoring(emptyOp(), rid01, callback2)
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

    expect(builtEvent!.equals(tx));
    expect(sentEvent!.equals(receipt.transactionRid));
    expect(confirmedEvent!.transactionRid.equals(receipt.transactionRid));

    const authDescriptorId = (await account00.getAuthDescriptors())[0].id;
    expect(callback).toHaveBeenCalledWith(
      anchoredHandlerCallbackParameters(
        connection00.client,
        [
          ftAuth(account00.id, authDescriptorId),
          emptyOp(),
          ftAuth(account00.id, authDescriptorId),
          emptyOp(),
          operation,
        ],
        1,
      ),
      null,
    );
    expect(callback2).toHaveBeenCalledWith(
      anchoredHandlerCallbackParameters(
        connection00.client,
        [
          ftAuth(account00.id, authDescriptorId),
          emptyOp(),
          ftAuth(account00.id, authDescriptorId),
          emptyOp(),
          operation,
        ],
        3,
      ),
      null,
    );
  });
});
