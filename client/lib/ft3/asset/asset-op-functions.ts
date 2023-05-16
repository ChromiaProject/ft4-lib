import { id } from ".";
import { BufferId } from "../../cryptoUtils";
import { LegacyTransactionBuilder } from "../utils/transaction-builder-old";
import { giveBalanceOp, registerAssetOp } from "./asset-dev-operations";
import { Amount } from "../asset/interfaces";
import { formatter } from "postchain-client";
import { nop } from "../utils";

export async function registerAsset(
  name: string,
  decimals: number,
  brid: BufferId,
  tb: LegacyTransactionBuilder
): Promise<Buffer> {
  const tx = await tb
    .add(registerAssetOp(name, decimals, formatter.ensureBuffer(brid)))
    .add(nop())
    .buildSigned();
  await tx.postAndWaitConfirmation();
  return id(name, brid);
}

export async function giveBalance(
  assetId: BufferId,
  accountId: BufferId,
  amount: Amount,
  tb: LegacyTransactionBuilder
) {
  const tx = await tb
    .add(
      giveBalanceOp(
        formatter.ensureBuffer(assetId),
        formatter.ensureBuffer(accountId),
        amount
      )
    )
    .add(nop())
    .buildSigned();
  await tx.postAndWaitConfirmation();
}
