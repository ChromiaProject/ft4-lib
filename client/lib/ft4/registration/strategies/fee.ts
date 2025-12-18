import { AnyAuthDescriptorRegistration } from "@ft4/accounts";
import { Asset, createAmountFromBalance } from "@ft4/asset";
import { KeyStore, LoginConfigOptions } from "@ft4/authentication";
import {
  RegistrationDetails,
  Strategy,
  StrategyError,
} from "@ft4/registration";
import {
  Connection,
  createConnectionToBlockchainRid,
  createKeyStoreInteractor,
} from "@ft4/ft-session";
import { hasPendingCreateAccountTransferForStrategy } from "./queries";
import { fetchLoginDetails } from "./main";
import { LoginDetails } from "./types";
import { authDescriptorRegistrationToGtv } from "@ft4/accounts/auth-descriptor/auth-descriptor-mapper";
import { getTransferStrategyRulesGroupedByStrategy } from "./transfer-rules";
import { BufferId, formatter } from "postchain-client";
import { TransferRef } from "@ft4/crosschain";

export function fee(
  senderBlockchainRid: BufferId,
  feeAsset: Asset,
  authDescriptor: AnyAuthDescriptorRegistration,
  loginConfig: LoginConfigOptions | null = null,
): Strategy {
  return Object.freeze({
    requiresSignature: true,
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

      const transferRules =
        await getTransferStrategyRulesGroupedByStrategy(targetConnection);
      const feeAssetTransferRules = transferRules
        .get("fee")
        ?.get(formatter.toString(feeAsset.id));
      const amount = feeAssetTransferRules?.reduce(
        (prev, curr) => (prev > curr.minAmount ? curr.minAmount : prev),
        feeAssetTransferRules.length > 0
          ? feeAssetTransferRules[0].minAmount
          : 0n,
      );

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
        const transferRef: TransferRef = {
          tx: pendingTransfer.tx,
          opIndex: pendingTransfer.opIndex,
        };
        await senderSession.account.resumeCrosschainTransfer(transferRef);
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
