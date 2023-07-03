import { id } from ".";
import { BufferId } from "../../cryptoUtils";
import { User } from "../accounts/types";
import { mintOp, registerAssetOp } from "./asset-dev-operations";
import { Amount, InvalidUrlError } from "../asset/interfaces";
import { formatter, GtxClient } from "postchain-client";
import { nop } from "../utils";
import { Buffer } from "buffer";

//-------------------ADMIN OPERATIONS-------------------//

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export async function registerAsset(
  user: User,
  adminUser: User,
  session: GtxClient,
  name: string,
  symbol: string,
  decimals: number,
  iconUrl?: string
): Promise<Buffer> {
  if (iconUrl?.trim() && !isValidUrl(iconUrl)) {
    throw new InvalidUrlError("Invalid URL for icon");
  }

  const tx = session.newTransaction([
    ...user.authDescriptor.signers,
    ...adminUser.authDescriptor.signers,
  ]);

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
