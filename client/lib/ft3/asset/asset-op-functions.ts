import { id } from ".";
import { BufferId } from "../../cryptoUtils";
import { TransactionBuilder } from "../utils/transaction-builder";
import { mintOp, burnOp, registerAssetOp } from "./asset-dev-operations";
import { AssetAmount } from "./types";
import { formatter } from "postchain-client";
import { nop } from "../utils";

export async function registerAsset(
  name: string,
  tb: TransactionBuilder
): Promise<Buffer> {
  const tx = await tb.add(registerAssetOp(name)).add(nop()).buildSigned();
  const brid = tx.gtx.blockchainRID;
  await tx.postAndWaitConfirmation();
  return id(name, brid);
}

export async function mint(
  assetId: BufferId,
  accountId: BufferId,
  amount: AssetAmount,
  tb: TransactionBuilder
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

export async function burn(
  assetId: BufferId,
  accountId: BufferId,
  amount: AssetAmount,
  tb: TransactionBuilder
) {
  const tx = await tb
    .add(
      burnOp(
        formatter.ensureBuffer(accountId),
        formatter.ensureBuffer(assetId),
        amount
      )
    )
    .add(nop())
    .buildSigned();
  await tx.postAndWaitConfirmation();
}
