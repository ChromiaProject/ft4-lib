import { Amount } from "@ft4/asset";
import { Authenticator, days } from "@ft4/authentication";
import {
  TransferRef,
  createOrchestrator,
  createResumeOrchestrator,
} from "@ft4/crosschain";
import { Connection } from "@ft4/ft-session";
import {
  BufferId,
  formatter,
  SignedTransaction,
  TransactionReceipt,
} from "postchain-client";
import { createRevertOrchestrator } from "@ft4/crosschain/orchestrator";
import { Web3CustomPromiEvent } from "@ft4/utils/promiEvent";

/**
 * Performs a cross chain transfer
 * @param connection - connection to the source chain, i.e., where the assets should be transferred from
 * @param authenticator - the authenticator used to authenticate the transfer
 * @param targetChainRid - the rid of the target blockchain, i.e., where the assets will end up
 * @param recipientId - the id of the account that will receive the assets
 * @param assetId - the id of the asset to transfer
 * @param amount - how much of the asset to transfer
 * @param ttl - timeout of this transfer in milliseconds. If the transfer has not been completed within this timeout, it can be reverted.
 * This argument is designed to be combined with one of the time functions, e.g., {@link days}.
 * @returns a promi-event that will emit once when transaction is signed, once when init_transfer has been sent on the source chain
 * and once for each hop during the transfer. It will resolve once the transfer is completed.
 */
export function crosschainTransfer(
  connection: Connection,
  authenticator: Authenticator,
  targetChainRid: BufferId,
  recipientId: BufferId,
  assetId: BufferId,
  amount: Amount,
  ttl: number = days(1),
): Web3CustomPromiEvent<
  TransferRef,
  {
    built: SignedTransaction;
    init: TransactionReceipt;
    hop: Buffer;
  }
> {
  const promiEvent = new Web3CustomPromiEvent<
    TransferRef,
    {
      built: SignedTransaction;
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
          promiEvent.emit("built", tx);
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

/**
 * Resumes a cross chain transfer that was started but not applied to the target chain yet. Which could happen
 * if for example one intermediary were down or the client were disrupted before the transfer was completed.
 * @param connection - connection to the source chain
 * @param pendingTransfer - the transfer to resume. Can be acquired using {@link accounts.Account.getPendingCrosschainTransfers | getPendingCrosschainTransfers}
 * @returns a promi-event that will emit once for each hop during the transfer. It will resolve once the transfer is completed.
 */
export function resumeCrosschainTransfer(
  connection: Connection,
  pendingTransfer: TransferRef,
): Web3CustomPromiEvent<
  void,
  {
    hop: Buffer;
  }
> {
  const promiEvent = new Web3CustomPromiEvent<
    void,
    {
      hop: Buffer;
    }
  >((resolve, reject) => {
    return createResumeOrchestrator(connection, pendingTransfer)
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

/**
 * Reverts a cross chain transfer that has timed out. I.e., returns the asset back to the sender account after the transfer
 * failed to be completed before the timeout. If the transfer has reached its final destination but you want to recall it,
 * use {@link crosschain.recallUnclaimedCrosschainTransfer | recallUnclaimedCrosschainTransfer}
 * @remarks If this function is called before the transfer has timed out, the promise will be rejected
 * @param connection - connection to the source chain. I.e., the chain where the account that originally sent the assets are registered.
 * @param pendingTransfer - the transfer to revert. Can be acquired using {@link accounts.Account.getPendingCrosschainTransfers | getPendingCrosschainTransfers}
 * @returns a promi-event that will emit once for each hop during the revert. It will resolve once the transfer is completely reverted.
 */
export function revertCrosschainTransfer(
  connection: Connection,
  pendingTransfer: TransferRef,
): Web3CustomPromiEvent<
  void,
  {
    hop: Buffer;
  }
> {
  const promiEvent = new Web3CustomPromiEvent<
    void,
    {
      hop: Buffer;
    }
  >((resolve, reject) => {
    return createRevertOrchestrator(connection, pendingTransfer)
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

/**
 * Does almost the same thing as {@link crosschain.revertCrosschainTransfer | revertCrosschainTransfer} but while that function works on transfers that were not delivered to
 * the target chain, this function is used if the assets were successfully delivered to the target chain but not claimed by an account. This will only happen when the target
 * chain has create on transfer account registration strategy enabled and no one claims the target account in time.
 * @remarks If this function is called before the transfer has timed out, the promise will be rejected
 * @param connection - connection to the source chain. I.e., the chain where the account that originally sent the assets are registered.
 * @param pendingTransfer - the transfer to recall. Can be acquired using {@link accounts.Account.getPendingCrosschainTransfers | getPendingCrosschainTransfers}
 * @returns a promi-event that will emit once for each hop during the recall. It will resolve once the transfer is completely recalled.
 */
export function recallUnclaimedCrosschainTransfer(
  connection: Connection,
  pendingTransfer: TransferRef,
): Web3CustomPromiEvent<
  void,
  {
    hop: Buffer;
  }
> {
  const promiEvent = new Web3CustomPromiEvent<
    void,
    {
      hop: Buffer;
    }
  >((resolve, reject) => {
    return createRevertOrchestrator(connection, pendingTransfer)
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
