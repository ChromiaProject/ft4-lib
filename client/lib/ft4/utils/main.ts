import { Connection } from "@ft4/ft-session";
import { Buffer } from "buffer";
import {
  BufferId,
  GTX,
  IClient,
  MERKLE_HASH_VERSIONS,
  Operation,
  Queryable,
  RawGtv,
  RawGtx,
  RellOperation,
  SignedTransaction,
  encryption,
  formatter,
  gtv,
  gtx,
} from "postchain-client";
import { Config, ConfigResponse } from "./types";
import { allAuthHandlers } from "./queries";
import { AuthHandler, FtKeyStore } from "@ft4/authentication";

/**
 * Creates a nop operation that can be included in a transaction
 */
export function nop(): Operation {
  return { name: "nop", args: [encryption.randomBytes(32)] };
}

/**
 * Uses the provided arguments to produce an operation that can be included in a transaction
 * @param name - the name of the operation
 * @param args - the arguments of the operation
 */
export function op(name: string, ...args: readonly RawGtv[]): Operation {
  return { name, args: args as RawGtv[] };
}

/**
 * Fetches the ft4 related config that is used on the blockchain
 * @param queryable - client to use to query the blockchain
 */
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

/**
 * Computes the transaction rid of the provided `RawGtx`
 * @param tx - the tx to compute the rid for
 * @param clientOrMerkleHashVersion - the client or connection to use to get the merkle hash version from,
 * or the merkle hash version itself
 */
export function getTransactionRid(
  tx: RawGtx | GTX,
  clientOrMerkleHashVersion: IClient | Connection | number,
): Buffer {
  let merkleHashVersion: number;
  if (typeof clientOrMerkleHashVersion === "number") {
    merkleHashVersion = clientOrMerkleHashVersion;
  } else {
    merkleHashVersion = getMerkleHashVersion(clientOrMerkleHashVersion);
  }
  if (Array.isArray(tx)) {
    return gtv.gtvHash(tx[0], merkleHashVersion); //tx body
  } else return gtv.gtvHash(gtx.gtxToRawGtxBody(tx), merkleHashVersion);
}

/**
 * Gets the merkle hash version from the provided client or connection
 * @param clientOrConnection the client or connection to get the merkle hash version from
 * @returns the merkle hash version
 */
export function getMerkleHashVersion(
  clientOrConnection: IClient | Connection,
): number {
  if ("config" in clientOrConnection) {
    return clientOrConnection.config.merkleHashVersion;
  } else {
    return clientOrConnection.client.config.merkleHashVersion;
  }
}

/**
 * Type assertion to determine if the provided value is a regular `GTX` or a `RawGtx`
 * @param tx - the tx value to assert
 * @returns true if provided value is a raw gtx
 */
export function isRawGtx(tx: GTX | RawGtx): tx is RawGtx {
  return Array.isArray(tx);
}

/**
 * Type assertion to assert if the provided value is an `Operation` or a `RellOperation`
 * @param op - the value to assert
 * @returns true if the provided value is a `RellOperation`
 */
export function isRellOperation(
  op: Operation | RellOperation,
): op is RellOperation {
  return (op as RellOperation).opName !== undefined;
}

/**
 * Derives a unique ID for a counter value for an auth descriptor on a specific account
 * @param accountId - the ID of the account in question
 * @param authDescriptorId - the ID of the auth descriptor in question
 */
export function getAuthDescriptorCounterIdForTxContext(
  accountId: BufferId,
  authDescriptorId: BufferId,
) {
  return accountId.toString("hex") + authDescriptorId.toString("hex");
}

/**
 * Returns the version of `ft` lib that is installed on the blockchain
 * @param session - a client that will be used to get the version from the blockchain
 */
export async function getVersion(session: IClient): Promise<string> {
  return Object.freeze(await session.query<string>("ft4.get_version"));
}

/**
 * Returns the API version of `ft` lib that is installed on the blockchain
 * @param session - a client that will be used to get the version from the blockchain
 */
export async function getApiVersion(session: IClient): Promise<number> {
  try {
    return Object.freeze(await session.query<number>("ft4.get_api_version"));
  } catch (e) {
    const v = await getVersion(session);
    if (v === "1.0.0") return 0;
    // get_version exists but get_api_version doesn't, and it's not v1.0.0
    throw e;
  }
}

/**
 * Retrieves all available auth handlers that is registered on the blockchain
 * @param queryable - the client to use to query the blockchain
 * @returns An object containing `AuthHandler`s which is keyed on the corresponding operation name
 */
export async function getAllAuthHandlers(
  queryable: Queryable,
): Promise<{ [key: string]: AuthHandler }> {
  const authHandlers = await queryable.query(allAuthHandlers());
  return authHandlers.reduce(
    (acc, curr) => ({ ...acc, [curr.name]: curr }),
    {},
  );
}

/**
 * Accepts an array which might be a mix of values and null/undefined and returns
 * the same array without said null/undefined values.
 * @param elements - the array to compact
 */
export function compactArray<T>(elements: (T | null | undefined)[]): T[] {
  return elements.filter(
    (element): element is T => element !== null && element !== undefined,
  );
}

/**
 * Instantiates a transaction which will contain the provided operations,
 * as well as signs it using the provided keystores.
 * @remarks Does not submit the transaction to the blockchain.
 * @param connection - used to determine what blockchain the transaction will be submitted to
 * @param operations - what operations to include in the transaction
 * @param keyStores - the keystores which will sign the transaction
 * @returns A serialized version of the signed transaction
 */
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

/**
 * Extracts one operation from a transaction. Useful e.g., to determine
 * what arguments was passed to a certain operation.
 * @param tx - the transaction which contains the operation
 * @param opIndex - at what index the operation can be found
 * @returns the operation at the specified index
 */
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

/**
 * Derives the nonce resulting nonce from the provided information
 * @param blockchainRid - the rid of the blockchain where the nonce is used
 * @param operation - what operation the nonce will be used with
 * @param authDescriptorCounter - current counter of the auth descriptor that will be used to authenticate the operation
 * @param merkleHashVersion - the merkle hash version selection defaults to one
 * @returns the computed nonce value
 */
export function deriveNonce(
  blockchainRid: BufferId,
  operation: Operation,
  authDescriptorCounter: number,
  merkleHashVersion: number = MERKLE_HASH_VERSIONS.ONE,
): string {
  return formatter.toString(
    gtv.gtvHash(
      [
        blockchainRid,
        operation.name,
        operation.args || [],
        authDescriptorCounter,
      ],
      merkleHashVersion,
    ),
  );
}
