import {
  EvmKeyStore,
  FtKeyStore,
  SessionWithLogout,
  createAuthenticator,
  getKeyHandlersForKeyStores,
  isFtKeyStore,
  deleteDisposableAuthDescriptors,
} from "@ft4/authentication";
import { compactArray, createAndSignTransaction } from "@ft4/utils";
import { IClient, Operation, Queryable, gtv } from "postchain-client";
import { registerAccount as registerAccountOp } from "./operations";
import { registerAccountMessage } from "./queries";
import { Strategy } from "./types";
import {
  createAuthDataService,
  createConnection,
  createSession,
} from "@ft4/ft-session";
import { evmSignatures } from "@ft4/transaction-builder/utils";

export async function registerAccount(
  client: IClient,
  masterKeyStore: FtKeyStore | EvmKeyStore,
  strategy: Strategy,
  registerAccountOperation: Operation = registerAccountOp(),
): Promise<SessionWithLogout> {
  const connection = createConnection(client);
  const { strategyOperation, loginKeyStore, disposableKeyStore } =
    await strategy.getRegistrationDetails(connection, masterKeyStore);

  // TODO: update strategy to return account id and then use the value here
  const accountId = gtv.gtvHash(masterKeyStore.id);

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

  const transaction = await createAndSignTransaction(
    connection,
    compactArray([
      // Insert "signatures" operation if EVM key store is used
      evmKeyStore &&
        (await evmSignaturesOperation(
          connection,
          evmKeyStore,
          strategyOperation,
        )),
      strategyOperation,
      registerAccountOperation,
    ]),
    ftKeyStores,
  );

  await connection.client.sendTransaction(transaction);

  const keyHandlers = await getKeyHandlersForKeyStores(
    connection,
    accountId,
    compactArray([evmKeyStore, ...ftKeyStores]),
  );

  const authenticator = createAuthenticator(
    accountId,
    keyHandlers,
    createAuthDataService(connection),
  );

  const session = createSession(connection, authenticator);
  return Object.freeze({
    session,
    logout: async () => {
      if (disposableKeyStore) {
        await deleteDisposableAuthDescriptors(
          connection,
          session.account,
          disposableKeyStore,
        );
      }
      if (loginKeyStore) {
        await loginKeyStore.clear(accountId);
      }
    },
  });
}

async function evmSignaturesOperation(
  queryable: Queryable,
  keyStore: EvmKeyStore,
  strategyOperation: Operation,
): Promise<Operation> {
  const message = await queryable.query(
    registerAccountMessage(strategyOperation),
  );
  const signature = await keyStore.signMessage(message);
  return evmSignatures([keyStore.address], [signature]);
}
