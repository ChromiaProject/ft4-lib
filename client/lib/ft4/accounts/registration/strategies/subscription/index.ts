import { RegistrationDetails, Strategy, StrategyError } from "../../types";
import { AnyAuthDescriptorRegistration } from "@ft4/accounts/auth-descriptor";
import { authDescriptorRegistrationToGtv } from "@ft4/accounts/auth-descriptor/gtv";
import { LoginConfigOptions } from "../../../../authentication/login";
import {
  Connection,
  KeyStore,
  createKeyStoreInteractor,
  createOrchestrator,
} from "@ft4/index";
import { Asset, createAmountFromBalance } from "@ft4/asset";
import { BufferId } from "@ft4/utils";
import { subscriptionAssets } from "../transfer/subscription/queries";
import { fetchLoginDetails } from "@ft4/accounts/registration/strategies";
import { createConnectionToBlockchainRid } from "@ft4/ft-session";

export function subscription(
  senderBlockchainRid: BufferId,
  subscriptionAsset: Asset,
  authDescriptor: AnyAuthDescriptorRegistration,
  loginConfig: LoginConfigOptions | null = null,
): Strategy {
  return Object.freeze({
    getRegistrationDetails: async (
      targetConnection: Connection,
      keyStore: KeyStore,
    ): Promise<RegistrationDetails> => {
      const senderConnection = await createConnectionToBlockchainRid(
        targetConnection,
        senderBlockchainRid,
      );
      const subscriptionAmounts =
        await targetConnection.query(subscriptionAssets());
      const amount = subscriptionAmounts.find(
        (amt) => amt.asset_id.compare(subscriptionAsset.id) === 0,
      )?.amount;
      if (amount === undefined) {
        throw new StrategyError(
          `Subscription strategy: asset <${subscriptionAsset.name}> is not supported for account creation.`,
        );
      }

      const { accountId, loginDetails } = await fetchLoginDetails(
        targetConnection,
        authDescriptor,
        loginConfig,
      );

      const senderSession = await createKeyStoreInteractor(
        senderConnection.client,
        keyStore,
      ).getSession(accountId);

      const orchestrator = await createOrchestrator(
        targetConnection.blockchainRid,
        accountId,
        subscriptionAsset.id,
        createAmountFromBalance(amount, subscriptionAsset.decimals),
        senderSession,
      );

      await new Promise((resolve, reject) => {
        orchestrator.onTransferError(reject);

        orchestrator.transfer().then(resolve).catch(reject);
      });

      const operation = {
        name: "ft4.ras_transfer_subscription",
        args: [
          subscriptionAsset.id,
          authDescriptorRegistrationToGtv(authDescriptor),
          loginDetails &&
            authDescriptorRegistrationToGtv(loginDetails.authDescriptor),
        ],
      };

      return {
        strategyOperation: operation,
        loginKeyStore: loginDetails?.loginKeyStore || null,
        disposableKeyStore: loginDetails?.disposableKeyStore || null,
      };
    },
  });
}
