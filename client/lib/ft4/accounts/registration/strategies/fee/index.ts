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
import { hasPendingCreateAccountTransferForStrategy } from "../transfer";
import { LoginDetails } from "../types";

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
      const { accountId, loginDetails } = await fetchLoginDetails(
        targetConnection,
        authDescriptor,
        loginConfig,
      );

      const account = await targetConnection.getAccountById(accountId);
      if (account)
        throw new StrategyError(
          `Account <${accountId.toString("hex")}> already registered on blockchain <${targetConnection.blockchainRid.toString("hex")}>`,
        );

      const senderConnection = await createConnectionToBlockchainRid(
        targetConnection,
        senderBlockchainRid,
      );

      const feeAmounts = await targetConnection.query(feeAssets());
      const amount = feeAmounts.find((amount) =>
        amount.asset_id.equals(feeAsset.id),
      )?.amount;

      if (amount === undefined) {
        throw new StrategyError(
          `Fee strategy: asset <${feeAsset.name}> is not supported for account creation.`,
        );
      }

      // Check if there is already a pending account creation.
      // I.e. check if account registration was interrupted.
      // If there is one, it means that transfer is already performed,
      // and assets are currently lock in pool account on target chain.
      const hasPendingAccountCreation = await targetConnection.query(
        hasPendingCreateAccountTransferForStrategy(
          "fee",
          senderBlockchainRid,
          accountId,
          accountId,
          feeAsset.id,
          amount,
        ),
      );

      // If pending account creation exists, skip cross-chain transfer
      // and return registration details in order to finalize registration.
      if (hasPendingAccountCreation) {
        return getRegistrationDetails(
          authDescriptor,
          feeAsset.id,
          loginDetails,
        );
      }

      const senderSession = await createKeyStoreInteractor(
        senderConnection.client,
        keyStore,
      ).getSession(accountId);

      // Check if cross-chain transfer is already initiated.
      // I.e. check if account registration was interrupted during cross-chain transfer.
      const pendingTransfer =
        await senderSession.account.getLastPendingCrosschainTransfer(
          targetConnection.blockchainRid,
          accountId,
          feeAsset.id,
          amount,
        );

      // If there is a pending cross-chain transfer for account registration, resume it,
      // otherwise start new cross-chain transfer.
      if (pendingTransfer) {
        await senderSession.account.resumeCrosschainTransfer(pendingTransfer);
      } else {
        await senderSession.account.crosschainTransfer(
          targetConnection.blockchainRid,
          accountId,
          feeAsset.id,
          createAmountFromBalance(amount, feeAsset.decimals),
        );
      }

      return getRegistrationDetails(authDescriptor, feeAsset.id, loginDetails);
    },
  });
}

function getRegistrationDetails(
  authDescriptor: AnyAuthDescriptorRegistration,
  assetId: Buffer,
  loginDetails: LoginDetails | null,
): RegistrationDetails {
  const operation = {
    name: "ft4.ras_transfer_fee",
    args: [
      assetId,
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
}
