import {
  createAccount,
  createTestAuthDescriptor,
  getSessionForAccount,
  rejectedOp,
  useChromiaNode,
} from "@ft4-test/util";
import {
  AnyAuthDescriptor,
  AuthFlag,
  deleteAllAuthDescriptorsExceptMain,
} from "@ft4/accounts";
import { Session, createConnection } from "@ft4/ft-session";
import { AuthorizationError } from "@ft4/transaction-builder";
import { nop, op } from "@ft4/utils";
import {
  gtx,
  ResponseStatus,
  SignedTransaction,
  TransactionReceipt,
  TxRejectedError,
  UnexpectedStatusError,
} from "postchain-client";

describe("transaction builder", () => {
  let session: Session;
  let authDescriptor: AnyAuthDescriptor;
  const getClient = useChromiaNode();

  beforeAll(async () => {
    const client = getClient();
    const connection = createConnection(client);

    const { keyPair, authDescriptor: _authDescriptor } =
      createTestAuthDescriptor([AuthFlag.Account, AuthFlag.Transfer]);
    authDescriptor = _authDescriptor;

    const accountId = await createAccount(connection.client, authDescriptor);

    session = await getSessionForAccount(connection, accountId, keyPair);
  });

  it("handles missing key handler in buildAndSend()", async () => {
    const promise = session
      .transactionBuilder()
      .add(op("empty_op_with_auth_handler"))
      .add(nop())
      .buildAndSend();

    await expect(promise).rejects.toThrow(AuthorizationError);
  }, 5000);

  it("handles missing key handler in buildAndSendWithAnchoring()", async () => {
    const promise = session
      .transactionBuilder()
      .add(op("empty_op_with_auth_handler"))
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
      .add(deleteAllAuthDescriptorsExceptMain())
      .add(nop())
      .buildAndSend()
      .on("built", (tx) => {
        builtEvent = tx;
      })
      .on("sent", (txRid) => {
        sentEvent = txRid;
      });

    expect(builtEvent!.equals(gtx.serialize(tx)));
    expect(sentEvent!.equals(receipt.transactionRid));
  }, 5000);

  it("buildAndSendWithAnchoring() emits events", async () => {
    let builtEvent: SignedTransaction | undefined = undefined;
    let sentEvent: Buffer | undefined = undefined;
    let confirmedEvent: TransactionReceipt | undefined = undefined;
    try {
      await session
        .transactionBuilder()
        .add(deleteAllAuthDescriptorsExceptMain())
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
    } catch (err) {
      /* Ignore */
    }

    expect(builtEvent).toBeTruthy();
    expect(sentEvent).toBeTruthy();
    expect(confirmedEvent!.status).toEqual(ResponseStatus.Confirmed);
  }, 5000);

  it("buildAndSendWithAnchoring() throws exception when directory chain is not available", async () => {
    const promise = session
      .transactionBuilder()
      .add(deleteAllAuthDescriptorsExceptMain())
      .add(nop())
      .buildAndSendWithAnchoring();

    await expect(promise).rejects.toThrow(
      new UnexpectedStatusError(
        400,
        "Unknown query: cm_get_blockchain_api_urls",
      ),
    );
  }, 5000);
});
