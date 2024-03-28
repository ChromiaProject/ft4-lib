import { Amount } from "@ft4/asset";
import { Authenticator, days } from "@ft4/authentication";
import {
  PendingTransfer,
  createOrchestrator,
  createResumeOrchestrator,
} from "@ft4/crosschain";
import { Connection } from "@ft4/ft-session";
import { BufferId } from "@ft4/utils";
import { Buffer } from "buffer";
import {
  SignedTransaction,
  TransactionReceipt,
  Web3PromiEvent,
  formatter,
} from "postchain-client";

export function crosschainTransfer(
  connection: Connection,
  authenticator: Authenticator,
  targetChainRid: BufferId,
  recipientId: BufferId,
  assetId: BufferId,
  amount: Amount,
  ttl: number = days(1),
): Web3PromiEvent<
  void,
  {
    signed: SignedTransaction;
    init: TransactionReceipt;
    hop: Buffer;
  }
> {
  const promiEvent = new Web3PromiEvent<
    void,
    {
      signed: SignedTransaction;
      init: TransactionReceipt;
      hop: Buffer;
    }
  >((resolve, reject) => {
    return createOrchestrator(
      connection,
      authenticator,
      targetChainRid,
      recipientId,
      assetId,
      amount,
      ttl,
    )
      .then((orchestrator) => {
        orchestrator.onTransferSigned((tx) => {
          promiEvent.emit("signed", tx);
        });
        orchestrator.onTransferInit((receipt) => {
          promiEvent.emit("init", receipt);
        });
        orchestrator.onTransferHop((blockchainRid) => {
          promiEvent.emit("hop", formatter.ensureBuffer(blockchainRid));
        });
        return orchestrator.transfer();
      })
      .then(() => resolve())
      .catch((reason) => reject(reason));
  });
  return promiEvent;
}

export function resumeCrosschainTransfer(
  connection: Connection,
  authenticator: Authenticator,
  pendingTransfer: PendingTransfer,
): Web3PromiEvent<
  void,
  {
    hop: Buffer;
  }
> {
  const promiEvent = new Web3PromiEvent<
    void,
    {
      hop: Buffer;
    }
  >((resolve, reject) => {
    return createResumeOrchestrator(connection, authenticator, pendingTransfer)
      .then((orchestrator) => {
        orchestrator.onTransferHop((blockchainRid) => {
          promiEvent.emit("hop", formatter.ensureBuffer(blockchainRid));
        });
        return orchestrator.resumeTransfer();
      })
      .then(() => resolve())
      .catch((reason) => reject(reason));
  });
  return promiEvent;
}
