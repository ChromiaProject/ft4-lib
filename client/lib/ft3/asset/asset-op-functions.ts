import { ensureBuffer } from "postchain-client/built/src/formatter";
import { GtxClient } from "postchain-client/built/src/gtx/interfaces";
import { id } from ".";
import { BufferId } from "../../cryptoUtils";
import { getAuthDescriptorSigners } from "../account/auth-descriptor";
import { User } from "../account/types";
import { send } from "../utils";
import { giveBalanceOp, registerAssetOp } from "./asset-dev-operations";
import { AssetAmount } from "./types";

export async function registerAsset(
  name: string,
  brid: BufferId,
  user: User,
  session: GtxClient
): Promise<Buffer> {
  const tx = session.newTransaction(
    getAuthDescriptorSigners(user.authDescriptor)
  );
  tx.addOperation(...registerAssetOp(name, ensureBuffer(brid)));
  await tx.sign(user.signatureProvider);
  await send(tx);
  return id(name, brid);
}

export async function giveBalance(
  assetId: BufferId,
  accountId: BufferId,
  amount: AssetAmount,
  user: User,
  session: GtxClient
) {
  const tx = session.newTransaction(
    getAuthDescriptorSigners(user.authDescriptor)
  );
  tx.addOperation(
    ...giveBalanceOp(ensureBuffer(assetId), ensureBuffer(accountId), amount)
  );
  await tx.sign(user.signatureProvider);
  await send(tx);
}
