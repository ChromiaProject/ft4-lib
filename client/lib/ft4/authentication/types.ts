import { AnyAuthDescriptor } from "@ft4/accounts";
import { Connection } from "@ft4/ft-session";
import { MerkleHashVersionSource, TxContext } from "@ft4/utils";
import { Buffer } from "buffer";
import { BufferId, GTX, Operation, RellOperation } from "postchain-client";
import { LoginConfig } from "./login";
import { EvmSigner } from "./evm";
import { FtSigner } from "./ft";

/**
 * Thrown to indicate that something went wrong when trying
 * to invoke an operation on a `KeyHandler`.
 */
export class KeyHandlerError extends Error {
  constructor(msg?: string) {
    super(msg);
    this.name = "KeyHandlerError";
  }
}

export type AuthHandler = {
  name: string;
  flags: string[];
  dynamic: boolean;
};
/**
 * Thrown to indicate that an error occurred during signing.
 * Such an error could for example be that the user rejected
 * the signature in MetaMask.
 */
export class SigningError extends Error {
  originalError: Error;

  constructor(message: string, originalError: Error) {
    super(message);
    this.name = "SigningError";
    this.originalError = originalError;
  }
}

/**
 * An authenticator holds keys that are associated with
 * a specific account and is responsible for selecting the
 * correct key when trying to authenticate an operation.
 *
 * The "correct key" in this case refers to the key with the least
 * possible privileges that will still be allowed to authenticate
 * the operation.
 */
export interface Authenticator {
  accountId: Buffer;
  keyHandlers: KeyHandler[];
  authDataService: AuthDataService;
  /**
   * Selects a KeyHandler from the list of key handlers available in this authenticator
   * that will be able to authenticate the specified operation.
   * @param operation - the operation to authenticate
   * @param txContext - a context object that is used in the context of a transaction
   * @returns a key handler that will be allowed to authenticate the specified operation. Or null if no such key handler exists
   */
  getKeyHandlerForOperation(
    operation: Operation,
    txContext: TxContext,
  ): Promise<KeyHandler | null>;
  /**
   * Returns the counter value for the specified auth descriptor for
   * the account that this authenticator is connected to.
   * @param authDescriptorId - the id of the auth descriptor to get the counter for
   */
  getAuthDescriptorCounter(authDescriptorId: BufferId): Promise<number | null>;
}

/**
 * Type that represents a key that is associated with an account.
 * It is responsible for using the wrapped key to sign and authorize
 * operations against an account.
 */
export interface KeyHandler {
  authDescriptor: AnyAuthDescriptor;
  keyStore: KeyStore;

  /**
   * Checks wether this key handler satisfies the auth requirements.
   * In other words, it checks if the underlying key has **all** of
   * the flags specified
   * @param flags - the flags to check
   * @returns true if this key has all of the specified flags, else false
   */
  satisfiesAuthRequirements(flags: string[]): boolean;

  /**
   * Authorizes an operation using the provided information
   * and produces an array of operations that at least contains
   * the operation to authorize. It might also contain auth operations
   * as appropriate.
   * @param accountId - id of the account to authorize against
   * @param operation - the operation to authorize
   * @param context - the context for the current transaction
   * @param authDataService - the auth data service to use when authorizing this operation
   */
  authorize(
    accountId: BufferId,
    operation: Operation,
    context: TxContext,
    authDataService: AuthDataService,
  ): Promise<Operation[]>;

  /**
   * Signs a transaction using the wrapped KeyStore
   * @param transaction - the transaction to sign
   * @param merkleHashVersionSource - the source of the merkle hash version
   * @returns the signed transaction, serialized as a `Buffer`
   */
  sign(
    transaction: GTX,
    merkleHashVersionSource: MerkleHashVersionSource,
  ): Promise<Buffer>;

  // FIXME
  /**
   * Returns the signers of this key handler
   */
  getSigners(): Buffer[];
}

export type Signer = KeyStore | EvmSigner | FtSigner;

/**
 * Holds a key which can either be interactive or non-interactive
 */
export interface KeyStore {
  id: Buffer;
  // when false, signing is performed without user interaction
  isInteractive: boolean;
  /**
   * Creates a KeyHandler instance from this KeyStore instance
   * @param authDescriptor - the auth descriptor to use with the KeyHandler
   */
  createKeyHandler(authDescriptor: AnyAuthDescriptor): KeyHandler;
}

/**
 * A utility class that is responsible for keeping track
 * of authorization details. Such as what operations there is,
 * what they require in terms of privileges and selecting the
 * correct auth descriptor for authorizing an operation.
 */
export interface AuthDataService {
  connection: Connection;
  /**
   * Returns the auth message template to use when signing a specified operation.
   * @param operation - the operation to get the message for
   */
  getAuthMessageTemplate(operation: Operation | RellOperation): Promise<string>;
  /**
   * Fetches the current counter value for an auth descriptor when authorizing against a certain account.
   * @remarks if more than one operation is performed with this auth descriptor on this account in the same
   * transaction, then this counter has to be manually increased after the first operation
   * @param accountId - the account id to authorize against
   * @param authDescriptorId - the auth descriptor to get the counter for
   * @returns current counter value, or null if none was found
   */
  getAuthDescriptorCounter(
    accountId: BufferId,
    authDescriptorId: BufferId,
  ): Promise<number | null>;
  /**
   * Retrieves the login config for a specific config name. If no name is provided,
   * the default login config will be used.
   * @param name - the name of the login config
   */
  getLoginConfig(name?: string): Promise<LoginConfig>;
  /**
   * Returns the blockchain rid to which this auth data service is configured.
   */
  getBlockchainRid(): Buffer;
  /**
   * Retrieves the auth handler that is defined for the operation with the provided name.
   * If the operation does not have an auth handler specified, null is returned
   * @param operationName - the name of the operation to get the auth handler for
   */
  getAuthHandlerForOperation(
    operationName: string,
  ): Promise<AuthHandler | null>;
  /**
   * Selects an auth descriptor from a list of auth descriptors which will be allowed
   * to authorize the specified operation
   * @param operation - the operation that is being authorized
   * @param accountId - the account for which the operation is being authorized
   * @param adIds - a list of auth descriptor ids to select from
   * @returns first auth descriptor id from the provided list that will be allowed to authorize the operation,
   * or null if none of the provided auth descriptors would be allowed.
   */
  getAllowedAuthDescriptor(
    operation: Operation,
    accountId: BufferId,
    adIds: BufferId[],
  ): Promise<Buffer | null>;
}
