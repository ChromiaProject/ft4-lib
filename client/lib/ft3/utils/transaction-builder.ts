import {
  GtxClient,
  Itransaction,
} from "postchain-client/built/src/gtx/interfaces";
import { AuthData, KeyManager } from "../account/auth/types";
import { User } from "../account/types";
import { Operation } from "./types";

export type TransactionBuilder = {
  _operations: Operation[];
  /**
   * Adds an operation to include in the final transaction
   * @param operation the operation to add to the transaction
   * @returns an instance of the transaction builder object
   */
  add: (operation: Operation) => TransactionBuilder;
  /**
   * Builds an unsigned transaction containgin the previously added
   * transactions, as well as any authhorization operations as needed.
   * @param signers array of participants that should sign this transaction
   * @returns A promised containing the unsigned transaction
   */
  build: (signers?: Buffer[]) => Promise<Itransaction>;
  /**
   * Builds a transaction and also signs it using the default signature provided.
   * If the optional parameter `signers` is not provided, the default participants
   * will be used.
   * @param signers array of participants that should sign this transaction
   * @returns A promise containing the signed transaction
   */
  buildSigned: (signers?: Buffer[]) => Promise<Itransaction>;
  user: User;
  session: GtxClient;
};

/**
 * Creates a new TransactionBuilder instance
 * @param user object that holds authentication information for the transaction
 * @param client object that holds connection info for the transaction
 * @returns a TransactionBuilder instance
 */
export function transactionBuilder(
  user: User,
  client: GtxClient
): TransactionBuilder {
  function add(operation: Operation): TransactionBuilder {
    this._operations.push(operation);
    return this;
  }

  async function build(signers: Buffer[] = []) {
    const txn = client.newTransaction(signers);
    const operations = Promise.all(
      this._operations.map(async (operation: Operation) => {
        let auth_data: AuthData = null;
        try {
          auth_data = await client.query(`${operation[0]}_auth_data`);
        } catch {
          auth_data = await client.query(`default_auth_data`);
        }
        const isUsable = (km: KeyManager) =>
          !!intersection(km.flags, auth_data.flags).length;
        const manager = user.keyManagers.find(isUsable);
        if (!manager) {
          throw new Error("No keymanager registered to handle this operation");
        }
        return await manager.authorize(operation, auth_data);
      })
    );
    (await operations).forEach((op: Operation) => txn.addOperation(...op));
    return txn;
  }

  async function buildSigned(signers: Buffer[] | undefined = undefined) {
    const participants = signers ? signers : user.authDescriptor.signers;
    const tx = await this.build(participants);
    return await tx.sign(user.signatureProvider);
  }

  const context: Partial<TransactionBuilder> = {
    _operations: [],
    session: client,
    user,
  };
  context.add = add.bind(context);
  context.build = build.bind(context);
  context.buildSigned = buildSigned.bind(context);

  return context as TransactionBuilder;
}

const intersection = (a: Set<any>, b: Set<any>) =>
  [...a].filter((x) => b.has(x));
