import { id } from ".";
import { BufferId } from "../../cryptoUtils";
import { LegacyTransactionBuilder } from "../utils/transaction-builder-old";
import { mintOp, registerAssetOp } from "./asset-dev-operations";
import { Amount } from "../asset/interfaces";
import { formatter } from "postchain-client";
import { nop } from "../utils";

export async function registerAsset(
  name: string,
  symbol: string,
  decimals: number,
  brid: BufferId,
  iconUrl: string,
  tb: LegacyTransactionBuilder
): Promise<Buffer> {
  const tx = await tb
    .add(
      registerAssetOp(
        name,
        symbol,
        decimals,
        formatter.ensureBuffer(brid),
        iconUrl
      )
    )
    .add(nop())
    .buildSigned();
  await tx.postAndWaitConfirmation();
  return id(name, brid);
}

export async function mint(
  accountId: BufferId,
  assetId: BufferId,
  amount: Amount,
  tb: LegacyTransactionBuilder
) {
  const tx = await tb
    .add(
      mintOp(
        formatter.ensureBuffer(accountId),
        formatter.ensureBuffer(assetId),
        amount
      )
    )
    .add(nop())
    .buildSigned();
  await tx.postAndWaitConfirmation();
}