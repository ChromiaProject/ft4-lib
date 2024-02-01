import {
  Connection,
  FtKeyStore,
  Session,
  createAuthenticator,
} from "@ft4/index";
import { Strategy } from "./types";
import { createAuthDataService, createSession } from "@ft4/ft-session";
import { gtv, gtx } from "postchain-client";
import { createAccountObject } from "../account-query-functions";
import { TxBuilderTransaction } from "@ft4/utils/types";

export async function registerAccount(
  connection: Connection,
  keyStore: FtKeyStore,
  strategy: Strategy,
): Promise<Session> {
  const operation = await strategy.getOperation();

  const transaction: TxBuilderTransaction = {
    blockchainRid: Buffer.from(connection.client.config.blockchainRid, "hex"),
    operations: [
      { opName: operation.name, args: operation.args || [] },
      { opName: "ft4.register_account", args: [] },
    ],
    signers: [keyStore.pubKey],
    signatures: [],
  };

  transaction.signatures = [await keyStore.sign(transaction)];
  await connection.client.sendTransaction(gtx.serialize(transaction));

  const accountId = gtv.gtvHash(keyStore.id);
  const account = createAccountObject(connection, accountId);
  const authDescriptors = await account.getAuthDescriptorsBySigner(keyStore.id);

  if (!authDescriptors.data.length) {
    throw new Error("Cannot load auth descriptors for created account");
  }

  const keyHandlers = authDescriptors.data.map((authDescriptor) =>
    keyStore.createKeyHandler(authDescriptor),
  );

  const authenticator = createAuthenticator(
    accountId,
    keyHandlers,
    createAuthDataService(connection),
  );

  return createSession(connection, authenticator);
}
