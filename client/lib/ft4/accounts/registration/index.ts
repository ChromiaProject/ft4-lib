import {
  Connection,
  EvmKeyStore,
  FtKeyStore,
  createAuthenticator,
} from "@ft4/index";
import { Strategy } from "./types";
import { createAuthDataService, createSession } from "@ft4/ft-session";
import { Operation, gtv } from "postchain-client";
import { registerAccountMessage } from "./queries";
import {
  registerAccountEvmSignatures,
  registerAccount as registerAccountOp,
} from "./operations";
import { compactArray, createAndSignTransaction } from "@ft4/utils";
import { getKeyHandlersForKeyStores, isFtKeyStore } from "@ft4/authentication";
import {
  SessionWithLogout,
  deleteDisposableAuthDescriptors,
} from "@ft4/authentication/login/index";

export async function registerAccount(
  connection: Connection,
  masterKeyStore: FtKeyStore | EvmKeyStore,
  strategy: Strategy,
  registerAccountOperation: Operation = registerAccountOp(),
): Promise<SessionWithLogout> {
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
  connection: Connection,
  keyStore: EvmKeyStore,
  strategyOperation: Operation,
): Promise<Operation> {
  const message = await connection.query(
    registerAccountMessage(strategyOperation),
  );
  const signature = await keyStore.signMessage(message);
  return registerAccountEvmSignatures([signature]);
}

export { StrategyError } from "./types";
