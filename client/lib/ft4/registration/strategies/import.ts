import { AnyAuthDescriptorRegistration, gtv } from "@ft4/accounts";
import { KeyStore, LoginConfigOptions } from "@ft4/authentication";
import {
  RegistrationDetails,
  Strategy,
  StrategyError,
  verifyAccount,
} from "@ft4/registration";
import {
  Connection,
  createConnectionToBlockchainRid,
  createKeyStoreInteractor,
} from "@ft4/ft-session";
import { fetchLoginDetails } from "./main";
import { BufferId, gtx, GTX } from "postchain-client";
import { getSystemAnchoringIccfProofOp } from "@ft4/transaction-builder";

export function importStrategy(
  originBrid: BufferId,
  iccfProofTransaction: GTX,
  mainAuthDescriptor: AnyAuthDescriptorRegistration,
  loginConfig: LoginConfigOptions | null = null,
): Strategy {
  return Object.freeze({
    getRegistrationDetails: async (
      targetChainConnection: Connection,
      keyStore: KeyStore,
    ): Promise<RegistrationDetails> => {
      const { accountId, loginDetails } = await fetchLoginDetails(
        targetChainConnection,
        mainAuthDescriptor,
        loginConfig,
      );

      const account = await targetChainConnection.getAccountById(accountId);
      if (account)
        throw new StrategyError(
          `Account <${accountId.toString("hex")}> already registered on blockchain <${targetChainConnection.blockchainRid.toString("hex")}>`,
        );

      const originConnection = await createConnectionToBlockchainRid(
        targetChainConnection,
        originBrid,
      );

      const originSession = await createKeyStoreInteractor(
        originConnection.client,
        keyStore,
      ).getSession(accountId);

      const verifyAccountTransactionWithReceipt =
        await originSession.call(verifyAccount);

      const iccfProofFunction = getSystemAnchoringIccfProofOp(
        originSession.client,
        verifyAccountTransactionWithReceipt.tx,
      );

      const iccfProofOperation = await iccfProofFunction(
        targetChainConnection.blockchainRid,
      );

      const operation = {
        name: "ft4.ras_import",
        args: [
          1,
          gtx.gtxToRawGtx(iccfProofTransaction),
          gtv.authDescriptorRegistrationToGtv(mainAuthDescriptor),
          loginDetails &&
            gtv.authDescriptorRegistrationToGtv(loginDetails.authDescriptor),
        ],
      };

      return {
        strategyOperation: operation,
        additionalOperations: [iccfProofOperation],
        loginKeyStore: loginDetails?.loginKeyStore || null,
        disposableKeyStore: loginDetails?.disposableKeyStore || null,
      };
    },
  });
}
