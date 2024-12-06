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
  Operation,
  Queryable,
  gtv,
  SignedTransaction,
  Web3PromiEvent,
  TransactionReceipt,
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
    sent: TransactionReceipt;
  }
> {
  const promiEvent = new Web3PromiEvent<
    SessionWithLogout,
    {
      built: SignedTransaction;
      sent: TransactionReceipt;
    }
  >((resolve, reject) => {
    const connection = createConnection(client);
    return strategy
      .getRegistrationDetails(connection, masterKeyStore)
      .then(({ strategyOperation, loginKeyStore, disposableKeyStore }) => {
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

        return Promise.all([
          loginKeyStore,
          disposableKeyStore,
          strategyOperation,
          evmKeyStore,
          ftKeyStores,
          evmKeyStore &&
            evmSignaturesOperation(
              connection,
              evmKeyStore,
              strategyOperation,
              registerAccountOperation,
            ),
        ]);
      })
      .then(
        ([
          loginKeyStore,
          disposableKeyStore,
          strategyOperation,
          evmKeyStore,
          ftKeyStores,
          signaturesOperation,
        ]) => {
          return Promise.all([
            loginKeyStore,
            disposableKeyStore,
            compactArray([evmKeyStore, ...ftKeyStores]),
            createAndSignTransaction(
              connection,
              compactArray([
                signaturesOperation,
                strategyOperation,
                registerAccountOperation,
              ]),
              ftKeyStores,
            ),
          ]);
        },
      )
      .then(([loginKeyStore, disposableKeyStore, keyStores, transaction]) => {
        promiEvent.emit("built", transaction);
        return Promise.all([
          loginKeyStore,
          disposableKeyStore,
          keyStores,
          connection.client
            .sendTransaction(transaction)
            .on("sent", (receipt) => {
              promiEvent.emit("sent", receipt);
            }),
        ]);
      })
      .then(([loginKeyStore, disposableKeyStore, keyStores, _]) => {
        const accountId = gtv.gtvHash(masterKeyStore.id);

        return Promise.all([
          loginKeyStore,
          disposableKeyStore,
          accountId,
          getKeyHandlersForKeyStores(connection, accountId, keyStores),
        ]);
      })
      .then(([loginKeyStore, disposableKeyStore, accountId, keyHandlers]) => {
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
      })
      .catch((reason) => reject(reason));
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
