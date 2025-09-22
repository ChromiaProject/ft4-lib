import {
  EvmKeyStore,
  FtKeyStore,
  SessionWithLogout,
  createAuthenticator,
  getKeyHandlersForKeyStores,
  isFtKeyStore,
  deleteDisposableAuthDescriptors,
  LoginKeyStore,
} from "@ft4/authentication";
import { compactArray, createAndSignTransaction } from "@ft4/utils";
import {
  IClient,
  MERKLE_HASH_VERSIONS,
  Operation,
  Queryable,
  SignedTransaction,
  TransactionEvent,
  Web3PromiEvent,
  gtv,
  gtx,
} from "postchain-client";
import { registerAccount as registerAccountOp } from "./operations";
import { registerAccountMessage } from "./queries";
import { Strategy } from "./types";
import {
  Session,
  createAuthDataService,
  createConnection,
  createSession,
} from "@ft4/ft-session";
import { evmSignatures } from "@ft4/transaction-builder/utils";
import { createGtxTransaction } from "@ft4/utils/main";

/**
 * Registers an account.
 *
 * Will emit events when the transaction is built, and when it is sent
 * (containing the transaction RID).
 */
export function registerAccount(
  client: IClient,
  masterKeyStore: FtKeyStore | EvmKeyStore,
  strategy: Strategy,
  registerAccountOperation: Operation = registerAccountOp(),
): Web3PromiEvent<
  SessionWithLogout,
  {
    built: SignedTransaction;
    sent: Buffer;
  }
> {
  const promiEvent = new Web3PromiEvent<
    SessionWithLogout,
    {
      built: SignedTransaction;
      sent: Buffer;
    }
  >((resolve, reject) => {
    const executeRegistration = async () => {
      try {
        const connection = createConnection(client);

        // Get registration details from strategy
        const {
          strategyOperation,
          additionalOperations,
          loginKeyStore,
          disposableKeyStore,
        } = await strategy.getRegistrationDetails(connection, masterKeyStore);

        const ftKeyStores: FtKeyStore[] = [];
        let evmKeyStore: EvmKeyStore | null = null;

        if (isFtKeyStore(masterKeyStore)) {
          ftKeyStores.push(masterKeyStore);
        } else {
          evmKeyStore = masterKeyStore;
        }

        if (disposableKeyStore) {
          ftKeyStores.push(disposableKeyStore);
        }

        const keyStores = compactArray([evmKeyStore, ...ftKeyStores]);

        let transaction: Buffer;
        if (strategy.requiresSignature) {
          // Prepare all operations and signatures
          const signaturesOperation = evmKeyStore
            ? await evmSignaturesOperation(
                connection,
                evmKeyStore,
                strategyOperation,
                registerAccountOperation,
              )
            : null;

          // Create and sign transaction
          transaction = await createAndSignTransaction(
            connection,
            compactArray([
              ...(additionalOperations || []),
              signaturesOperation,
              strategyOperation,
              registerAccountOperation,
            ]),
            ftKeyStores,
          );
        } else {
          const gtxTransaction = await createGtxTransaction(
            connection,
            compactArray([
              ...(additionalOperations || []),
              strategyOperation,
              registerAccountOperation,
            ]),
            ftKeyStores,
          );
          gtxTransaction.signers = [];
          transaction = gtx.serialize(gtxTransaction);
        }

        promiEvent.emit("built", transaction);

        // Send transaction
        if (additionalOperations?.find((x) => x.name === "iccf_proof")) {
          await connection.client
            .sendTransactionWithRetries(transaction)
            .on(TransactionEvent.Rejected, (receipt) => {
              console.log("Transaction rejected: ", receipt);
            })
            .on(TransactionEvent.DappReceived, (receipt) => {
              promiEvent.emit("sent", receipt.transactionRid);
            });
        } else {
          await connection.client
            .sendTransaction(transaction)
            .on(TransactionEvent.DappReceived, (receipt) => {
              promiEvent.emit("sent", receipt.transactionRid);
            });
        }

        // Create account ID and get key handlers
        const accountId = gtv.gtvHash(
          masterKeyStore.id,
          MERKLE_HASH_VERSIONS.ONE, //the version doesn't matter, it's a buffer
        );

        const keyHandlers = await getKeyHandlersForKeyStores(
          connection,
          accountId,
          keyStores,
        );

        // Create authenticator and session
        const authenticator = createAuthenticator(
          accountId,
          keyHandlers,
          createAuthDataService(connection),
        );

        const session = createSession(connection, authenticator);

        resolve(
          Object.freeze({
            session,
            logout: logoutSession(session, disposableKeyStore, loginKeyStore),
          }),
        );
      } catch (reason) {
        reject(reason);
      }
    };

    executeRegistration();
  });
  return promiEvent;
}

/**
 * Creates a function that can be used to log out a session,
 * which it does by removing the disposable auth descriptor(s)
 * associated with the account stored in the provided session.
 * @param session - session to use for this action
 * @param disposableKeyStore - the key store that holds the disposable key for this session
 * @param loginKeyStore - the key store which holds all disposable keys
 * @remarks This function is only suitable if the key to the disposable keystore is
 * still available. If not, the admin will have to manually delete auth descriptors
 * or wait until they expire.
 */
export function logoutSession(
  session: Session,
  disposableKeyStore: FtKeyStore | null,
  loginKeyStore: LoginKeyStore | null,
): () => Promise<void> {
  return async () => {
    if (disposableKeyStore) {
      await deleteDisposableAuthDescriptors(
        session,
        session.account,
        disposableKeyStore,
      );
    }
    if (loginKeyStore) {
      await loginKeyStore.clear(session.account.id);
    }
  };
}

async function evmSignaturesOperation(
  queryable: Queryable,
  keyStore: EvmKeyStore,
  strategyOperation: Operation,
  registerAccountOperation: Operation,
): Promise<Operation> {
  const message = await queryable.query(
    registerAccountMessage(strategyOperation, registerAccountOperation),
  );
  const signature = await keyStore.signMessage(message);
  return evmSignatures([keyStore.address], [signature]);
}
