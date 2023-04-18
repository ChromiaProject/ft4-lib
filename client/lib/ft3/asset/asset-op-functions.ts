/* eslint @typescript-eslint/ban-ts-comment: 0 */
import { GtxClient } from "postchain-client/built/src/gtx/interfaces";
import { id } from ".";
import { BufferId } from "../../cryptoUtils";
import { getAuthDescriptorSigners } from "../account/auth-descriptor";
import { User } from "../account/types";
import { giveBalanceOp, registerAssetOp } from "./asset-dev-operations";
import { AssetAmount } from "./types";
import { formatter } from "postchain-client";
import { nop } from "../utils";

export async function registerAsset(
  user: User,
  session: GtxClient,
  name: string,
  brid: BufferId
): Promise<Buffer> {
  const tx = session.newTransaction(
    getAuthDescriptorSigners(user.authDescriptor)
  );
  // @ts-ignore
  tx.addOperation(...registerAssetOp(name, formatter.ensureBuffer(brid)));
  tx.addOperation(...nop());
  await tx.sign(user.signatureProvider);
  await tx.postAndWaitConfirmation();
  return id(name, brid);
}

export async function giveBalance(
  user: User,
  session: GtxClient,
  assetId: BufferId,
  accountId: BufferId,
  amount: AssetAmount
) {
  const tx = session.newTransaction(
    getAuthDescriptorSigners(user.authDescriptor)
  );
  // @ts-ignore
  tx.addOperation(
    ...giveBalanceOp(
      formatter.ensureBuffer(assetId),
      formatter.ensureBuffer(accountId),
      amount
    )
  );
  tx.addOperation(...nop());
  await tx.sign(user.signatureProvider);
  await tx.postAndWaitConfirmation();
}
