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
  SignedTransaction,
  TransactionReceipt,
  Web3PromiEvent,
} from "postchain-client";
import { createRevertOrchestrator } from "@ft4/crosschain/orchestrator";
import { HopData, SolveTransferEvents, UnclaimedTransferStatus } from "./types";
import { getTransactionRid } from "@ft4/utils";
import { evaluatePendingTransfer, isUnclaimedTransfer } from "./utils";

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
): Web3PromiEvent<
  TransferRef,
  {
    built: SignedTransaction;
    init: TransactionReceipt;
    hop: HopData;
  }
> {
  const promiEvent = new Web3PromiEvent<
    TransferRef,
    {
      built: SignedTransaction;
      init: TransactionReceipt;
      hop: HopData;
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
        orchestrator.onTransferHop((hopData) => {
          promiEvent.emit("hop", hopData);
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
): Web3PromiEvent<
  void,
  {
    hop: HopData;
  }
> {
  const promiEvent = new Web3PromiEvent<
    void,
    {
      hop: HopData;
    }
  >((resolve, reject) => {
    return createResumeOrchestrator(connection, pendingTransfer)
      .then((orchestrator) => {
        orchestrator.onTransferHop((hopData) => {
          promiEvent.emit("hop", hopData);
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
): Web3PromiEvent<
  void,
  {
    hop: HopData;
  }
> {
  const promiEvent = new Web3PromiEvent<
    void,
    {
      hop: HopData;
    }
  >((resolve, reject) => {
    return createRevertOrchestrator(connection, pendingTransfer)
      .then((orchestrator) => {
        orchestrator.onTransferHop((hopData) => {
          promiEvent.emit("hop", hopData);
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
 * @param connection - connection to the source chain. I.e., the chain where the account that originally sent the assets is registered.
 * @param pendingTransfer - the transfer to recall. Can be acquired using {@link accounts.Account.getPendingCrosschainTransfers | getPendingCrosschainTransfers}
 * @returns a promi-event that will emit once for each hop during the recall. It will resolve once the transfer is completely recalled.
 */
export function recallUnclaimedCrosschainTransfer(
  connection: Connection,
  pendingTransfer: TransferRef,
): Web3PromiEvent<
  void,
  {
    hop: HopData;
  }
> {
  const promiEvent = new Web3PromiEvent<
    void,
    {
      hop: HopData;
    }
  >((resolve, reject) => {
    return createRevertOrchestrator(connection, pendingTransfer)
      .then((orchestrator) => {
        orchestrator.onTransferHop((hopData) => {
          promiEvent.emit("hop", hopData);
        });
        return orchestrator.recallUnclaimedTransfer();
      })
      .then(() => resolve())
      .catch((reason) => reject(reason));
  });
  return promiEvent;
}

/**
 * Solves a pending transfer. This is useful if the transfer is stuck in a pending state and you want to solve it.
 * It will automatically complete it, revert it, recall it, based on the current state of the transfer.
 * @param connection - connection to the source chain. I.e., the chain where the account that originally sent the assets is registered.
 * @param pendingTransfer - the transfer to solve. Can be acquired using {@link accounts.Account.getPendingCrosschainTransfers | getPendingCrosschainTransfers}
 * @returns a promi-event that will emit once for each hop during the solve. It will resolve once the transfer is completely solved.
 */
export function solvePendingCrosschainTransfer(
  connection: Connection,
  pendingTransfer: TransferRef,
): Web3PromiEvent<void, SolveTransferEvents> {
  const promiEvent = new Web3PromiEvent<void, SolveTransferEvents>(
    async (resolve, reject) => {
      const txRid = getTransactionRid(pendingTransfer.tx, connection);
      const info = await connection.getPendingTransfersFiltered({
        transactionIds: [txRid],
        initOpIndex: pendingTransfer.opIndex,
      });
      if (info.data.length !== 1) {
        return reject(
          new Error("Expected 1 transfer, got " + info.data.length),
        );
      }
      const transfer = info.data[0];

      promiEvent.emit("found", txRid);

      const evaluation = await evaluatePendingTransfer(transfer, connection);

      promiEvent.emit("evaluated", evaluation);

      // if not expired, push it through
      if (!evaluation.expired) {
        try {
          await resumeCrosschainTransfer(connection, pendingTransfer).on(
            "hop",
            (hop) => promiEvent.emit("hop", hop),
          );

          const isUnclaimed = await isUnclaimedTransfer(
            txRid,
            pendingTransfer.opIndex,
            connection,
          );
          if (isUnclaimed === UnclaimedTransferStatus.MustBeRecalled) {
            await recallUnclaimedCrosschainTransfer(
              connection,
              pendingTransfer,
            ).on("hop", (hopData) => promiEvent.emit("hop", hopData));
          }
          return resolve();
        } catch (reason) {
          return reject(reason);
        }
      }

      // if it's expired but it reached the target chain
      if (evaluation.reachedTargetChain) {
        // it just needs to be completed
        await resumeCrosschainTransfer(connection, pendingTransfer).on(
          "hop",
          (hopData) => promiEvent.emit("hop", hopData),
        );
        // ... and if the end account does not exist, it's unclaimed and uncompleted.
        if (!evaluation.claimed) {
          try {
            const isUnclaimed = await isUnclaimedTransfer(
              txRid,
              pendingTransfer.opIndex,
              connection,
            );
            if (isUnclaimed === UnclaimedTransferStatus.MustBeRecalled) {
              await recallUnclaimedCrosschainTransfer(
                connection,
                pendingTransfer,
              ).on("hop", (hopData) => promiEvent.emit("hop", hopData));
            }
            return resolve();
          } catch (reason) {
            return reject(reason);
          }
        }
      }

      // if it's expired and it did not reach the target chain, it must be reverted
      try {
        await revertCrosschainTransfer(connection, pendingTransfer).on(
          "hop",
          (hopData) => promiEvent.emit("hop", hopData),
        );
        return resolve();
      } catch (reason) {
        return reject(reason);
      }
    },
  );
  return promiEvent;
}
