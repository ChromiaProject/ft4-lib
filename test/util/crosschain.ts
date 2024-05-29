import { registerCrosschainAsset as registerCrosschainAssetOp } from "@ft4/admin/admin-operations";
import { Asset, CrosschainAssetRegistration } from "@ft4/asset";
import { Connection } from "@ft4/ft-session";
import { BufferId } from "@ft4/utils";
import { SignatureProvider, formatter } from "postchain-client";

/**
 * Registers crosschain asset by providing asset registration object.
 * It's used to register crosschain assets with invalid parameters.
 * Function with the same name defined in the lib, ensures that all parameters
 * are valid by loading them from origin chain. This prevents us from testing some scenarios,
 * and therefore we had to define a function that would allow us to pass arbitrary asset parameters.
 *
 * @param connection connection to the chain where asset will be registered
 * @param adminSignatureProvider signature provider for admin user
 * @param asset asset registration object with crosschain asset parameters
 * @param originBlockchainRid blockchain rid of the chain that will be used as the origin chain for crosschain transfers
 * @returns
 */
export async function registerCrosschainAsset(
  connection: Connection,
  adminSignatureProvider: SignatureProvider,
  asset: CrosschainAssetRegistration,
  originBlockchainRid: BufferId,
) {
  return {
    receipt: await connection.client.signAndSendUniqueTransaction(
      registerCrosschainAssetOp(asset, originBlockchainRid),
      adminSignatureProvider,
    ),
  };
}

export function mapAssetToCrosschainAssetRegistration(
  asset: Asset,
  uniquenessResolver: BufferId = Buffer.alloc(0),
): CrosschainAssetRegistration {
  return Object.freeze({
    id: asset.id,
    name: asset.name,
    symbol: asset.symbol,
    decimals: asset.decimals,
    blockchainRid: asset.blockchainRid,
    iconUrl: asset.iconUrl,
    type: asset.type,
    uniquenessResolver: formatter.ensureBuffer(uniquenessResolver),
  });
}
