import { nop } from "@ft4/utils";
import { emptyOp } from "../util/util";
import { createConnection } from "@ft4/index";
import { SignedTransaction } from "postchain-client";
import { useChromiaNode } from "@ft4/util/chromia-node";
import { createTestAuthDescriptor } from "../util/util";
import { createAccount } from "../util/util";
import { getSessionForAccount } from "../util/util";
import { Session } from "@ft4/index";
import { AuthorizationError } from "@ft4/utils/transaction-builder/index";
import { deleteAllAuthDescriptorsExclude } from "@ft4/accounts/account-operations";
import { AnyAuthDescriptor } from "@ft4/index";
import { rejectedOp } from "../util/util";
import { TxRejectedError } from "postchain-client";
import { TransactionReceipt } from "postchain-client";
import { ResponseStatus } from "postchain-client";
import { SystemChainException } from "postchain-client";

describe("transaction builder", () => {
  let session: Session;
  let authDescriptor: AnyAuthDescriptor;
  const getClient = useChromiaNode();

  beforeAll(async () => {
    const client = getClient();
    const connection = createConnection(client);

    const { keyPair, authDescriptor: _authDescriptor } =
      createTestAuthDescriptor(["A"]);
    authDescriptor = _authDescriptor;

    await createAccount(connection.client, authDescriptor);

    session = await getSessionForAccount(
      connection,
      authDescriptor.id,
      keyPair,
    );
  });

  it("handles missing key handler in buildAndSend()", async () => {
    const promise = session
      .transactionBuilder()
      .add(emptyOp())
      .add(nop())
      .buildAndSend();

    await expect(promise).rejects.toThrow(AuthorizationError);
  }, 5000);

  it("handles missing key handler in buildAndSendWithAnchoring()", async () => {
    const promise = session
      .transactionBuilder()
      .add(emptyOp())
      .add(nop())
      .buildAndSendWithAnchoring();

    await expect(promise).rejects.toThrow(AuthorizationError);
  }, 5000);

  it("handles rejected transaction in buildAndSend()", async () => {
    const promise = session
      .transactionBuilder()
      .add(rejectedOp())
      .add(nop())
      .buildAndSend();

    await expect(promise).rejects.toThrow(TxRejectedError);
  }, 5000);

  it("handles rejected transaction in buildAndSendWithAnchoring()", async () => {
    const promise = session
      .transactionBuilder()
      .add(rejectedOp())
      .add(nop())
      .buildAndSendWithAnchoring();

    await expect(promise).rejects.toThrow(TxRejectedError);
  }, 5000);

  it("buildAndSend() emits events", async () => {
    let builtEvent: SignedTransaction | undefined = undefined;
    let sentEvent: Buffer | undefined = undefined;
    const { tx, receipt } = await session
      .transactionBuilder()
      .add(
        deleteAllAuthDescriptorsExclude(session.account.id, authDescriptor.id),
      )
      .add(nop())
      .buildAndSend()
      .on("built", (tx) => {
        builtEvent = tx;
      })
      .on("sent", (txRid) => {
        sentEvent = txRid;
      });

    expect(builtEvent!.equals(tx));
    expect(sentEvent!.equals(receipt.transactionRid));
  }, 5000);

  it("buildAndSendWithAnchoring() emits events, and rejects when directory chain is unavailable", async () => {
    let builtEvent: SignedTransaction | undefined = undefined;
    let sentEvent: Buffer | undefined = undefined;
    let confirmedEvent: TransactionReceipt | undefined = undefined;
    const promise = session
      .transactionBuilder()
      .add(
        deleteAllAuthDescriptorsExclude(session.account.id, authDescriptor.id),
      )
      .add(nop())
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

    await expect(promise).rejects.toThrow(SystemChainException);

    expect(builtEvent).toBeTruthy();
    expect(sentEvent).toBeTruthy();
    expect(confirmedEvent!.status).toEqual(ResponseStatus.Confirmed);
  }, 5000);
});
