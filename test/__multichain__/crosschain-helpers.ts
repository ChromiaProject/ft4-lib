import {
  AccountBuilder,
  adminUser,
  emptyOp,
  getNewAsset,
} from "@ft4-test/util";
import { AuthenticatedAccount, AuthFlag } from "@ft4/accounts";
import { Asset, createAmount } from "@ft4/asset";
import { days, noopAuthenticator } from "@ft4/authentication";
import {
  HopData,
  revertCrosschainTransfer,
  PendingTransfer,
} from "@ft4/crosschain";
import { extractInitArgs } from "@ft4/crosschain/utils";
import {
  Connection,
  createConnectionToBlockchainRid,
  createSession,
} from "@ft4/ft-session";
import { nop } from "@ft4/utils";
import { registerCrosschainAsset } from "@ft4/admin";
import {
  BufferId,
  GTX,
  TransactionReceipt,
  Web3PromiEvent,
  gtx,
} from "postchain-client";

export async function initAndApplyCrosschainTransfer(
  recipientAccountId: BufferId,
  assetToTransfer: Asset,
  targetChainRid: BufferId,
  initAccount: AuthenticatedAccount,
  forceExpiration: boolean = false,
  expirationTime: number = days(1),
): Promise<{ initTxReceipt: TransactionReceipt; initTx: GTX }> {
  return await createTransferAndStopIt(
    initAccount,
    recipientAccountId,
    targetChainRid,
    assetToTransfer,
    1,
    forceExpiration,
    expirationTime,
  );
}

export async function initAndCancelCrosschainTransfer(
  recipientAccountId: BufferId,
  assetToTransfer: Asset,
  targetChainRid: BufferId,
  initAccount: AuthenticatedAccount,
): Promise<{ initTxReceipt: TransactionReceipt; initTx: GTX }> {
  const rx = await createTransferAndStopIt(
    initAccount,
    recipientAccountId,
    targetChainRid,
    assetToTransfer,
    0,
    true,
    2000,
  );

  const pe = revertCrosschainTransfer(initAccount.connection, {
    tx: rx.initTx,
    opIndex: 1,
  });
  await stopPromiEventAfterNthHop(pe, 0);

  return rx;
}

export async function initApplyCancelUnapplyCrosschainTransfer(
  recipientAccountId: BufferId,
  assetToTransfer: Asset,
  targetChainRid: BufferId,
  initAccount: AuthenticatedAccount,
): Promise<{ initTxReceipt: TransactionReceipt; initTx: GTX }> {
  const rx = await initAndApplyCrosschainTransfer(
    recipientAccountId,
    assetToTransfer,
    targetChainRid,
    initAccount,
    true,
    5000,
  );

  //cancel on recipient chain and unapply on intermediate chain
  const pe = revertCrosschainTransfer(initAccount.connection, {
    tx: rx.initTx,
    opIndex: 1,
  });
  await stopPromiEventAfterNthHop(pe, 1);

  return rx;
}

/**
 *
 * @param senderAccount - The account that will send the transfer
 * @param recipientAccountId - The ID of the recipient account
 * @param targetChainRid - The RID of the target chain
 * @param assetToTransfer - The asset to transfer
 * @param stopAfterBlockchainRidOrHops - The RID of the chain to stop the transfer after or the number of
 * hops to stop the transfer after. 0 means after init, 1 means after the first hop, etc.
 * @param forceExpiration - Whether to force expiration of the transfer on the next hop
 * @returns The transaction receipt of the init transfer
 */
export async function createTransferAndStopIt(
  senderAccount: AuthenticatedAccount,
  recipientAccountId: BufferId,
  targetChainRid: BufferId,
  assetToTransfer: Asset,
  stopAfterBlockchainRidOrHops: BufferId | number,
  forceExpiration: boolean,
  expirationTime: number = 5000,
): Promise<{
  initTxReceipt: TransactionReceipt;
  initTx: GTX;
}> {
  let stopAsString: string | undefined;
  let stopAsNumber: number | undefined;
  if (typeof stopAfterBlockchainRidOrHops === "number") {
    stopAsNumber = stopAfterBlockchainRidOrHops;
  } else {
    stopAsString = stopAfterBlockchainRidOrHops.toString("hex");
  }
  let initTxReceipt: TransactionReceipt | undefined = undefined;
  let initTx: GTX | undefined = undefined;
  const hops: Buffer[] = [senderAccount.connection.blockchainRid];

  let i = 1;
  try {
    await senderAccount
      .crosschainTransfer(
        targetChainRid,
        recipientAccountId,
        assetToTransfer.id,
        createAmount(100, assetToTransfer.decimals),
        expirationTime,
      )
      .on("built", (tx) => {
        initTx = gtx.deserialize(tx);
        const initArgs = extractInitArgs({
          tx: initTx,
          opIndex: 1,
        } as PendingTransfer);
        hops.push(...initArgs[3]);
      })
      .on("init", (tx) => {
        initTxReceipt = tx;
        if (
          stopAsNumber === 0 ||
          stopAsString ===
            senderAccount.connection.blockchainRid.toString("hex")
        ) {
          throw new Error("Transfer stopped");
        }
      })
      .on("hop", (hopData) => {
        if (
          hopData.brid.toString("hex") === stopAsString ||
          i === stopAsNumber
        ) {
          throw new Error("Transfer stopped");
        }
        i++;
      });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Error in listener for event")
    ) {
      if (forceExpiration) {
        for (const chain of hops) {
          const intermediateConnection = await createConnectionToBlockchainRid(
            senderAccount.connection,
            chain,
          );
          // Force block building to get past deadline
          await createSession(intermediateConnection, noopAuthenticator)
            .transactionBuilder()
            .add(emptyOp(), { authenticator: noopAuthenticator })
            .add(nop(), { authenticator: noopAuthenticator })
            .buildAndSend();
        }
      }

      return { initTxReceipt, initTx } as any;
    }
    throw error;
  }
  throw Error("Transfer wasn't stopped");
}

/**
 * stops a promi-event after the nth hop
 * @param promiEvent - The promi-event to stop
 * @param nthHop - The number of hops to stop the promi-event after, starting from 0
 */
export async function stopPromiEventAfterNthHop(
  promiEvent: Web3PromiEvent<any, { hop: HopData }>,
  nthHop: number,
): Promise<void> {
  let i = 0;
  promiEvent.on("hop", () => {
    if (i === nthHop) {
      throw new Error("Transfer stopped");
    }
    i++;
  });
  try {
    await promiEvent;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Error in listener for event")
    ) {
      return;
    }
    throw error;
  }
  throw Error("Transfer wasn't stopped");
}

export async function setupTestWithCrosschainTransfer<T extends boolean>(
  assetPath: Connection[],
  assetName: string,
  registerRecipientAccount: T,
): Promise<{
  senderAccount: AuthenticatedAccount;
  recipientAccount: T extends true ? AuthenticatedAccount : undefined;
  asset: Asset;
}> {
  const asset = await getNewAsset(
    assetPath[0].client,
    assetName,
    assetName.replace("crosschain-", "CROSSCHAIN-"),
  );

  for (let i = 1; i < assetPath.length; i++) {
    try {
      await registerCrosschainAsset(
        assetPath[i].client,
        adminUser(assetPath[i].client.config.merkleHashVersion)
          .signatureProvider,
        asset.id,
        assetPath[i - 1].blockchainRid,
      );
    } catch (error) {
      continue;
    }
  }

  const senderAccount = await AccountBuilder.account(assetPath[0])
    .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
    .withBalance(asset, createAmount(100, asset.decimals))
    .build();

  let recipientAccount: AuthenticatedAccount | undefined = undefined;
  if (registerRecipientAccount) {
    recipientAccount = await AccountBuilder.account(
      assetPath[assetPath.length - 1],
    )
      .withAuthFlags(AuthFlag.Account, AuthFlag.Transfer)
      .build();
  }

  return {
    senderAccount,
    recipientAccount: recipientAccount as any,
    asset,
  };
}

export async function checkBalances(
  senderAccount: AuthenticatedAccount,
  recipientAccount: AuthenticatedAccount | undefined,
  asset: Asset,
  balances: { sender?: number; recipient?: number },
) {
  const senderBalance = await senderAccount.getBalanceByAssetId(asset.id);
  const recipientBalance = recipientAccount
    ? await recipientAccount.getBalanceByAssetId(asset.id)
    : undefined;
  expect(senderBalance?.amount.toString()).toEqual(
    balances.sender ? "" + balances.sender : undefined,
  );
  expect(recipientBalance?.amount.toString()).toEqual(
    balances.recipient ? "" + balances.recipient : undefined,
  );
}
