import { Amount } from "@ft4/asset";
import { Authenticator, days } from "@ft4/authentication";
import {
  TransferRef,
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
import { createRevertOrchestrator } from "@ft4/crosschain/orchestrator";

export function crosschainTransfer(
  connection: Connection,
  authenticator: Authenticator,
  targetChainRid: BufferId,
  recipientId: BufferId,
  assetId: BufferId,
  amount: Amount,
  ttl: number = days(1),
): Web3PromiEvent<
  TransferRef,
  {
    signed: SignedTransaction;
    init: TransactionReceipt;
    hop: Buffer;
  }
> {
  const promiEvent = new Web3PromiEvent<
    TransferRef,
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
      .then((tr) => resolve(tr))
      .catch((reason) => reject(reason));
  });
  return promiEvent;
}

export function resumeCrosschainTransfer(
  connection: Connection,
  authenticator: Authenticator,
  pendingTransfer: TransferRef,
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

export function revertCrosschainTransfer(
  connection: Connection,
  authenticator: Authenticator,
  pendingTransfer: TransferRef,
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
    return createRevertOrchestrator(connection, authenticator, pendingTransfer)
      .then((orchestrator) => {
        orchestrator.onTransferHop((blockchainRid) => {
          promiEvent.emit("hop", formatter.ensureBuffer(blockchainRid));
        });
        return orchestrator.revertTransfer();
      })
      .then(() => resolve())
      .catch((reason) => reject(reason));
  });
  return promiEvent;
}

export function recallUnclaimedCrosschainTransfer(
  connection: Connection,
  authenticator: Authenticator,
  pendingTransfer: TransferRef,
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
    return createRevertOrchestrator(connection, authenticator, pendingTransfer)
      .then((orchestrator) => {
        orchestrator.onTransferHop((blockchainRid) => {
          promiEvent.emit("hop", formatter.ensureBuffer(blockchainRid));
        });
        return orchestrator.recallUnclaimedTransfer();
      })
      .then(() => resolve())
      .catch((reason) => reject(reason));
  });
  return promiEvent;
}
