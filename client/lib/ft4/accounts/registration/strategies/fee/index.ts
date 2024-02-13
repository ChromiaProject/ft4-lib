import { RegistrationDetails, Strategy, StrategyError } from "../../types";
import {
  AnyAuthDescriptorRegistration,
  aggregateSigners,
} from "@ft4/accounts/auth-descriptor";
import { authDescriptorRegistrationToGtv } from "@ft4/accounts/auth-descriptor/gtv";
import { LoginConfigOptions } from "@ft4/authentication/login-manager";
import {
  Connection,
  KeyStore,
  createConnection,
  createKeyStoreInteractor,
  createOrchestrator,
} from "@ft4/index";
import {
  getAccountIdFromSigners,
  getLoginDetails,
} from "@ft4/accounts/registration/strategies";
import { Asset, createAmountFromBalance } from "@ft4/asset";
import { BufferId } from "@ft4/utils";
import { createClient } from "postchain-client";
import { feeAssets } from "../transfer/fee/queries";

export function fee(
  feeAsset: Asset,
  authDescriptor: AnyAuthDescriptorRegistration,
  loginConfig: LoginConfigOptions | null = null,
  senderAccountId: BufferId,
  targetBlockchainRid: BufferId,
): Strategy {
  return Object.freeze({
    getRegistrationDetails: async (
      connection: Connection,
      keyStore: KeyStore,
    ): Promise<RegistrationDetails> => {
      const recipientAccountId = getAccountIdFromSigners(
        aggregateSigners(authDescriptor),
      );

      const targetChainConnection = createConnection(
        await createClient({
          directoryNodeUrlPool: "" + connection.client.config.endpointPool,
          blockchainRid: targetBlockchainRid.toString("hex"),
        }),
      );
      const feeAmounts = await targetChainConnection.query(feeAssets());

      const amount = feeAmounts.find(
        (amt) => amt.asset_id.compare(feeAsset.id) === 0,
      )?.amount;

      if (amount === undefined) {
        throw new StrategyError(
          `Fee strategy: asset <${feeAsset.name}> is not supported for account creation.`,
        );
      }

      const senderSession = await createKeyStoreInteractor(
        connection.client,
        keyStore,
      ).getSession(senderAccountId);

      const orchestrator = await createOrchestrator(
        targetBlockchainRid,
        recipientAccountId,
        feeAsset.id,
        createAmountFromBalance(amount, feeAsset.decimals),
        senderSession,
      );

      await orchestrator.transfer();

      const loginDetails =
        loginConfig &&
        (await getLoginDetails(connection, recipientAccountId, loginConfig));

      const operation = {
        name: "ft4.ras_transfer_fee",
        args: [
          feeAsset.id,
          authDescriptorRegistrationToGtv(authDescriptor),
          loginDetails &&
            authDescriptorRegistrationToGtv(loginDetails.authDescriptor),
        ],
      };

      return {
        strategyOperation: operation,
        loginKeyStore: loginDetails?.keyStore || null,
      };
    },
  });
}
