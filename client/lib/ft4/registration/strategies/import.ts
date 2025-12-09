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
import { BufferId, GTX, gtx, gtv, formatter } from "postchain-client";
import { getSystemAnchoringIccfProofOp } from "@ft4/transaction-builder";
import { CanImportAccountResult, ImportStrategyOptions } from "./types";
import { getImportConfig } from "./query-functions";
import { getMerkleHashVersion } from "@ft4/utils/main";

/**
 * Creates an import strategy for registering an account from another blockchain.
 *
 * @param originBrid - The blockchain RID where the original account exists.
 * @param mainAuthDescriptor - The main auth descriptor of the account to import.
 * @param loginConfig - The config if the account should be created with an active session, otherwise null.
 * @param options - The options for the import strategy, including whether to force signature and origin account ID.
 * @returns A Strategy instance that can be used to retrieve registration details.
 */
export function importStrategy(
  originBrid: BufferId,
  mainAuthDescriptor: AnyAuthDescriptorRegistration,
  loginConfig: LoginConfigOptions | null = null,
  options: ImportStrategyOptions = {},
): Strategy {
  // Determine if signature is required based on options
  // This returns the opposite of the condition that allows import without signature:
  // !(targetChainConfig.allowAnyOperation && (options.forceSignature === undefined || options.forceSignature === false))
  // Since we can't access targetChainConfig.allowAnyOperation synchronously, we use a conservative approach:
  // - If forceSignature is explicitly true, signature is required
  // - If forceSignature is explicitly false, signature is not required
  // - If forceSignature is undefined, signature is required (conservative default)

  const requiresSignature = options.forceSignature !== false;

  return Object.freeze({
    requiresSignature,
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

      const targetChainConfig = await getImportConfig(targetChainConnection);

      if (
        !targetChainConfig.trustedChains.find(
          (chain) =>
            formatter.toString(chain) === formatter.ensureString(originBrid),
        )
      ) {
        throw new StrategyError(
          `Blockchain <${originBrid.toString("hex")}> is not trusted for the import strategy`,
        );
      }

      if (
        !targetChainConfig.allowAnyOperation &&
        options.forceSignature === false
      ) {
        throw new StrategyError(
          `Blockchain <${targetChainConnection.blockchainRid.toString("hex")}> does not allow importing an account without a signature`,
        );
      }

      if (
        targetChainConfig.allowAnyOperation &&
        (options.forceSignature === undefined ||
          options.forceSignature === false)
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
            targetChainConfig.importAccountTimeout,
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
  minTimestamp: number,
  loginDetails: LoginDetails | null = null,
): Promise<RegistrationDetails> {
  const transfers = await originSession.account.getTransferHistory();
  let txToProve: GTX | undefined = undefined;
  for (const transfer of transfers.data) {
    const txId = transfer.transactionId;
    const tx = gtx.deserialize(await originSession.client.getTransaction(txId));

    if (transfer.timestamp.getTime() < Date.now() - minTimestamp) {
      break;
    }

    if (
      tx.operations.find((op) => {
        const validEvmAuth =
          op.opName === "ft4.evm_auth" &&
          expectedAccountId.equals(op.args[0] as Buffer);
        const validFtAuth =
          op.opName === "ft4.ft_auth" &&
          expectedAccountId.equals(op.args[0] as Buffer);
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

/**
 * Checks which accounts can be imported from trusted chains.
 *
 * @param targetChainConnection - The connection to the target blockchain where the account would be imported.
 * @param keyStore - The keystore to use for checking accounts on trusted chains.
 * @returns A promise that resolves to an array of results indicating which accounts can be imported and whether they require signatures.
 */
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
