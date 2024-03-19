import { RegistrationDetails, Strategy, StrategyError } from "../../types";
import { AnyAuthDescriptorRegistration } from "@ft4/accounts/auth-descriptor";
import { authDescriptorRegistrationToGtv } from "@ft4/accounts/auth-descriptor/gtv";
import { LoginConfigOptions } from "../../../../authentication/login";
import { Connection, KeyStore, createKeyStoreInteractor } from "@ft4/index";
import { Asset, createAmountFromBalance } from "@ft4/asset";
import { BufferId } from "@ft4/utils";
import { feeAssets } from "../transfer/fee/queries";
import { fetchLoginDetails } from "@ft4/accounts/registration/strategies";
import { createConnectionToBlockchainRid } from "@ft4/ft-session";

export function fee(
  senderBlockchainRid: BufferId,
  feeAsset: Asset,
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
      const feeAmounts = await targetConnection.query(feeAssets());
      const amount = feeAmounts.find(
        (amt) => amt.asset_id.compare(feeAsset.id) === 0,
      )?.amount;
      if (amount === undefined) {
        throw new StrategyError(
          `Fee strategy: asset <${feeAsset.name}> is not supported for account creation.`,
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

      await senderSession.account.crosschainTransfer(
        targetConnection.blockchainRid,
        accountId,
        feeAsset.id,
        createAmountFromBalance(amount, feeAsset.decimals),
      );

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
        loginKeyStore: loginDetails?.loginKeyStore || null,
        disposableKeyStore: loginDetails?.disposableKeyStore || null,
      };
    },
  });
}
