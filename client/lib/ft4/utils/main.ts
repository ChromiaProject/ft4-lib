import { Connection } from "@ft4/ft-session";
import { Buffer } from "buffer";
import {
  GTX,
  IClient,
  KeyPair,
  Operation,
  Queryable,
  RawGtv,
  RawGtx,
  SignedTransaction,
  encryption,
  gtv,
  gtx,
} from "postchain-client";
import { BufferId, Config, ConfigResponse } from "./types";
import { allAuthHandlers } from "./queries";
import { AuthHandler, FtKeyStore } from "@ft4/authentication";

export function nop(): Operation {
  return { name: "nop", args: [encryption.randomBytes(32)] };
}

export function op(name: string, ...args: readonly RawGtv[]): Operation {
  return { name, args: args as RawGtv[] };
}

export async function getConfig(queryable: Queryable): Promise<Config> {
  const response = await queryable.query<ConfigResponse>("ft4.get_config");
  return Object.freeze({
    rateLimit: {
      active: response.rate_limit.active,
      maxPoints: response.rate_limit.max_points,
      recoveryTime: response.rate_limit.recovery_time,
      pointsAtAccountCreation: response.rate_limit.points_at_account_creation,
    },
    authDescriptor: {
      maxRules: response.auth_descriptor.max_rules,
      maxNumberPerAccount: response.auth_descriptor.max_number_per_account,
    },
  });
}

export function getTransactionRid(tx: RawGtx): Buffer {
  return gtv.gtvHash(tx[0]); //tx body
}

export function getNonceIdForTxContext(
  accountId: BufferId,
  authDescriptorId: BufferId,
) {
  return accountId.toString("hex") + authDescriptorId.toString("hex");
}

export async function getVersion(session: IClient): Promise<string> {
  return Object.freeze(await session.query<string>("ft4.get_version"));
}

export function getPubkey(keyPair: KeyPair): Buffer {
  return keyPair.pubKey ?? encryption.createPublicKey(keyPair.privKey);
}

export async function getAllAuthHandlers(
  queryable: Queryable,
): Promise<{ [key: string]: AuthHandler }> {
  const authHandlers = await queryable.query(allAuthHandlers());
  return authHandlers.reduce(
    (acc, curr) => ({ ...acc, [curr.name]: curr }),
    {},
  );
}

export function compactArray<T>(elements: (T | null)[]): T[] {
  return elements.filter((element): element is T => element !== null);
}

export async function createAndSignTransaction(
  connection: Connection,
  operations: Operation[],
  keyStores: FtKeyStore[],
): Promise<Buffer> {
  const ops = operations.map(({ name, args }) => ({
    opName: name,
    args: args || [],
  }));

  const transaction: GTX = {
    blockchainRid: connection.blockchainRid,
    operations: ops,
    signers: keyStores.map((keyStore) => keyStore.pubKey),
    signatures: [],
  };

  transaction.signatures = await Promise.all(
    keyStores.map((keyStore) => keyStore.sign(transaction)),
  );

  return gtx.serialize(transaction);
}

export function loadOperationFromTransaction(
  tx: RawGtx | SignedTransaction,
  opIndex: number,
): Operation {
  const transaction = Buffer.isBuffer(tx) ? (gtv.decode(tx) as RawGtx) : tx;
  const operations = transaction[0][1];
  const operation = operations[opIndex];
  return {
    name: operation[0],
    args: operation[1],
  };
}
