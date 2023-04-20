import { id } from ".";
import { BufferId } from "../../cryptoUtils";
import { User } from "../account/types";
import { giveBalanceOp, registerAssetOp } from "./asset-dev-operations";
import { AssetAmount } from "./types";
import { formatter } from "postchain-client";
import { nop } from "../utils";
import { GtxClient } from "postchain-client/built/src/gtx/interfaces";

//-------------------ADMIN OPERATIONS-------------------//

export async function registerAsset(
  user: User,
  adminUser: User,
  session: GtxClient,
  name: string,
  brid: BufferId
): Promise<Buffer> {
  const tx = session.newTransaction([
    ...user.authDescriptor.signers,
    ...adminUser.authDescriptor.signers,
  ]);
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  tx.addOperation(...registerAssetOp(name, formatter.ensureBuffer(brid)));
  tx.addOperation(...nop());
  await tx.sign(user.signatureProvider);
  await tx.sign(adminUser.signatureProvider);
  await tx.postAndWaitConfirmation();
  return id(name, brid);
}

export async function giveBalance(
  user: User,
  adminUser: User,
  session: GtxClient,
  assetId: BufferId,
  accountId: BufferId,
  amount: AssetAmount
) {
  const tx = session.newTransaction([
    ...user.authDescriptor.signers,
    ...adminUser.authDescriptor.signers,
  ]);
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
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
  await tx.sign(adminUser.signatureProvider);
  await tx.postAndWaitConfirmation();
}
