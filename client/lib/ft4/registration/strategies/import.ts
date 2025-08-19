import {
  AnyAuthDescriptorRegistration,
  gtv as AuthDescriptorGtv,
} from "@ft4/accounts";
import { KeyStore, LoginConfigOptions } from "@ft4/authentication";
import {
  LoginDetails,
  RegistrationDetails,
  Strategy,
  StrategyError,
  verifyAccount,
} from "@ft4/registration";
import {
  Connection,
  createConnectionToBlockchainRid,
  createKeyStoreInteractor,
  Session,
} from "@ft4/ft-session";
import { fetchLoginDetails } from "./main";
import { BufferId, GTX, gtx, gtv } from "postchain-client";
import { getSystemAnchoringIccfProofOp } from "@ft4/transaction-builder";
import { CanImportAccountResult, ImportStrategyOptions } from "./types";
import { getImportConfig } from "./query-functions";
import { getMerkleHashVersion } from "@ft4/utils/main";

export function importStrategy(
  originBrid: BufferId,
  mainAuthDescriptor: AnyAuthDescriptorRegistration,
  loginConfig: LoginConfigOptions | null = null,
  options: ImportStrategyOptions = {},
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

      if (
        options.forceSignature === undefined ||
        options.forceSignature === false
      ) {
        try {
          const originSession = await createKeyStoreInteractor(
            originConnection.client,
            keyStore,
          ).getSession(accountId);

          return await importStrategyWithoutSignature(
            originSession,
            targetChainConnection,
            accountId,
            mainAuthDescriptor,
            loginDetails,
          );
        } catch (e) {
          if (options.forceSignature === false) {
            throw e;
          }
        }
      }

      const originSession = await createKeyStoreInteractor(
        originConnection.client,
        keyStore,
      ).getSession(options.originAccountId ?? accountId);

      return await importStrategyWithSignature(
        originSession,
        targetChainConnection,
        mainAuthDescriptor,
        loginDetails,
      );
    },
  });
}

async function importStrategyWithSignature(
  originSession: Session,
  targetChainConnection: Connection,
  mainAuthDescriptor: AnyAuthDescriptorRegistration,
  loginDetails: LoginDetails | null = null,
): Promise<RegistrationDetails> {
  const originFlags = (await originSession.account.getMainAuthDescriptor()).args
    .flags;

  const verifyAccountTransactionWithReceipt = await originSession
    .transactionBuilder()
    .add(verifyAccount())
    .buildAndSendWithAnchoring();

  const iccfProofOperation =
    await verifyAccountTransactionWithReceipt.systemConfirmationProof(
      targetChainConnection.blockchainRid,
    );

  const operation = {
    name: "ft4.ras_import",
    args: [
      gtx.gtxToRawGtx(verifyAccountTransactionWithReceipt.tx),
      AuthDescriptorGtv.authDescriptorRegistrationToGtv(mainAuthDescriptor),
      loginDetails &&
        AuthDescriptorGtv.authDescriptorRegistrationToGtv(
          loginDetails.authDescriptor,
        ),
      originFlags,
    ],
  };

  return {
    strategyOperation: operation,
    additionalOperations: [iccfProofOperation],
    loginKeyStore: loginDetails?.loginKeyStore || null,
    disposableKeyStore: loginDetails?.disposableKeyStore || null,
  };
}

async function importStrategyWithoutSignature(
  originSession: Session,
  targetChainConnection: Connection,
  expectedAccountId: Buffer,
  mainAuthDescriptor: AnyAuthDescriptorRegistration,
  // TODO min timestamp
  loginDetails: LoginDetails | null = null,
): Promise<RegistrationDetails> {
  const transfers = await originSession.account.getTransferHistory();
  let txToProve: GTX | undefined = undefined;
  for (const transfer of transfers.data) {
    const txId = transfer.transactionId;
    const tx = gtx.deserialize(await originSession.client.getTransaction(txId));

    // TODO if timestamp is too old, break

    if (
      tx.operations.find((op) => {
        const validEvmAuth =
          op.opName === "ft4.evm_auth" && op.args[0] === expectedAccountId;
        const validFtAuth =
          op.opName === "ft4.ft_auth" && op.args[0] === expectedAccountId;
        return validEvmAuth || validFtAuth;
      })
    ) {
      txToProve = tx;
      break;
    }
  }

  if (!txToProve) {
    throw new StrategyError("No transaction to prove found");
  }

  const proof = await getSystemAnchoringIccfProofOp(
    originSession.client,
    txToProve,
  )(targetChainConnection.blockchainRid);

  const operation = {
    name: "ft4.ras_import",
    args: [
      gtx.gtxToRawGtx(txToProve),
      AuthDescriptorGtv.authDescriptorRegistrationToGtv(mainAuthDescriptor),
      loginDetails &&
        AuthDescriptorGtv.authDescriptorRegistrationToGtv(
          loginDetails.authDescriptor,
        ),
    ],
  };

  return {
    strategyOperation: operation,
    additionalOperations: [proof],
    loginKeyStore: loginDetails?.loginKeyStore || null,
    disposableKeyStore: loginDetails?.disposableKeyStore || null,
  };
}

export async function canImportAccount(
  targetChainConnection: Connection,
  keyStore: KeyStore,
): Promise<CanImportAccountResult[]> {
  const config = await getImportConfig(targetChainConnection);
  const result: CanImportAccountResult[] = [];
  for (const trustedChain of config.trustedChains) {
    const trustedChainConnection = await createConnectionToBlockchainRid(
      targetChainConnection,
      trustedChain,
    );
    const trustedChainKeyStoreInteractor = createKeyStoreInteractor(
      trustedChainConnection.client,
      keyStore,
    );
    const accountsOnTrustedChain =
      await trustedChainKeyStoreInteractor.getAccounts();
    for (const account of accountsOnTrustedChain) {
      const allowsNoSignature = config.allowAnyOperation;
      const accountIdMatchesKeyStore = account.id.equals(
        gtv.gtvHash(keyStore.id, getMerkleHashVersion(trustedChainConnection)),
      );
      result.push({
        originChain: trustedChain,
        originAccountId: account.id,
        requiresSignature: !(allowsNoSignature && accountIdMatchesKeyStore),
      });
    }
  }
  return result;
}
