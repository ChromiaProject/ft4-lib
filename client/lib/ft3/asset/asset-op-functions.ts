import { GtxClient } from "postchain-client/built/src/gtx/interfaces";
import { getAuthDescriptorSigners } from "../account/auth-descriptor";
import { User } from "../account/types";
import { send } from "../utils";
import { giveBalanceOp, registerAssetOp } from "./asset-dev-operations";
import { AssetAmount } from "./types";

export async function registerAsset(
  name: string,
  brid: Buffer,
  user: User,
  session: GtxClient
) {
  const tx = session.newTransaction(
    getAuthDescriptorSigners(user.authDescriptor)
  );
  tx.addOperation(...registerAssetOp(name, brid));
  await tx.sign(user.signatureProvider);
  await send(tx);
}

export async function giveBalance(
  assetId: Buffer,
  accountId: Buffer,
  amount: AssetAmount,
  user: User,
  session: GtxClient
) {
  const tx = session.newTransaction(
    getAuthDescriptorSigners(user.authDescriptor)
  );
  tx.addOperation(...giveBalanceOp(assetId, accountId, amount));
  await tx.sign(user.signatureProvider);
  await send(tx);
}
