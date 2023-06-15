import { id } from ".";
import { BufferId } from "../../cryptoUtils";
import { User } from "../account/types";
import { mintOp, registerAssetOp } from "./asset-dev-operations";
import { Amount, InvalidUrlError } from "../asset/interfaces";
import { formatter } from "postchain-client";
import { nop } from "../utils";
import { GtxClient } from "postchain-client/built/src/gtx/interfaces";

//-------------------ADMIN OPERATIONS-------------------//

export async function registerAsset(
  user: User,
  adminUser: User,
  session: GtxClient,
  name: string,
  symbol: string,
  decimals: number,
  iconUrl?: string
): Promise<Buffer> {
  // Validate icon URL
  if (iconUrl?.trim()) {
    try {
      new URL(iconUrl);
    } catch (_) {
      throw new InvalidUrlError("Invalid URL for icon");
    }
  }

  const tx = session.newTransaction([
    ...user.authDescriptor.signers,
    ...adminUser.authDescriptor.signers,
  ]);

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  tx.addOperation(...registerAssetOp(name, symbol, decimals, iconUrl));
  tx.addOperation(...nop());

  await tx.sign(user.signatureProvider);
  await tx.sign(adminUser.signatureProvider);
  await tx.postAndWaitConfirmation();

  const brid = tx.gtx.blockchainRID;
  return id(name, brid);
}

export async function mint(
  user: User,
  adminUser: User,
  session: GtxClient,
  accountId: BufferId,
  assetId: BufferId,
  amount: Amount
) {
  const tx = session.newTransaction([
    ...user.authDescriptor.signers,
    ...adminUser.authDescriptor.signers,
  ]);
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  tx.addOperation(
    ...mintOp(
      formatter.ensureBuffer(accountId),
      formatter.ensureBuffer(assetId),
      amount
    )
  );
  tx.addOperation(...nop());
  await tx.sign(user.signatureProvider);
  await tx.sign(adminUser.signatureProvider);
  await tx.postAndWaitConfirmation();
}
