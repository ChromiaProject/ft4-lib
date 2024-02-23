import {
  Connection,
  EvmKeyStore,
  FtKeyStore,
  Session,
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

export async function registerAccount(
  connection: Connection,
  keyStore: FtKeyStore | EvmKeyStore,
  strategy: Strategy,
  registerAccountOperation: Operation = registerAccountOp(),
): Promise<Session> {
  const { strategyOperation, loginKeyStore } =
    await strategy.getRegistrationDetails(connection, keyStore);

  // TODO: update strategy to return account id and then use the value here
  const accountId = gtv.gtvHash(keyStore.id);

  const ftKeyStores: FtKeyStore[] = [];
  let evmKeyStore: EvmKeyStore | null = null;

  if (isFtKeyStore(keyStore)) {
    ftKeyStores.push(keyStore);
  } else {
    evmKeyStore = keyStore;
  }

  if (loginKeyStore) {
    ftKeyStores.push(loginKeyStore);
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

  return createSession(connection, authenticator);
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
