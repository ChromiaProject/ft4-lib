import { Authenticator, KeyHandler } from "/ft4/authentication";
import { Buffer } from "buffer";
import { deriveAccountId } from "/ft4/accounts";
import {
  Operation,
  gtx,
  IClient,
  isBlockAnchored,
  getAnchoringClient,
  createClient,
  BlockAnchoringException,
  SignedTransaction,
  TransactionReceipt,
} from "postchain-client";
import { TxBuilderTransaction } from "../types";
import { OperationNotExistError } from "../errors";
import {
  AnchoringTimeoutError,
  AuthorizationError,
  OnAnchoredHandler,
  OperationContext,
  TransactionBuilder,
  TransactionBuilderConfig,
} from "./types";
import { getTransactionRid } from "..";

const defaultConfig: TransactionBuilderConfig = {
  retryCount: 3,
  waitTimeMs: 500,
};

/**
 * Creates a new TransactionBuilder instance
 * @param user object that holds authentication information for the transaction
 * @param client object that holds connection info for the transaction
 * @returns a TransactionBuilder instance
 */
export function transactionBuilder(
  authenticator: Authenticator,
  client: IClient,
  config: TransactionBuilderConfig = defaultConfig,
): TransactionBuilder {
  function add(
    operation: Operation,
    onAnchoredHandler?: OnAnchoredHandler,
  ): TransactionBuilder {
    this._operations.push({ operation, authenticator, onAnchoredHandler });
    return this;
  }

  function toPubkeys(keyHandlers: KeyHandler[]): Buffer[] {
    return keyHandlers
      .map((handler) => handler.getSigners())
      .filter((pubKey): pubKey is Buffer[] => !!pubKey)
      .flat();
  }

  async function buildUnsigned() {
    const [operations, keyHandlers] = await authenticateOperations(
      this._operations,
    );

    keyHandlers.forEach((kh) => this._keyhandlersUsed.push(kh));

    const txn: TxBuilderTransaction = {
      blockchainRid: Buffer.from(client.config.blockchainRid, "hex"),
      operations: [],
      signers: toPubkeys(this._keyhandlersUsed),
      signatures: [],
    };
    const addOperation = (op: Operation) => {
      txn.operations.push({ opName: op.name, args: op.args ?? [] });
    };
    operations.forEach((op: Operation | Operation[]) => {
      Array.isArray(op) ? op.forEach(addOperation) : addOperation(op);
    });
    return txn;
  }

  async function authenticateOperations(
    opContexts: OperationContext[],
  ): Promise<[Operation[], KeyHandler[]]> {
    const keyHandlers: KeyHandler[] = [];
    const nonces = new Map<string, number>();
    const processedOperations: Operation[][] = [];

    for (const opContext of opContexts) {
      const { operation, authenticator } = opContext;
      if (
        !(await authenticator.authDataService.isOperationExposed(
          operation.name,
        ))
      ) {
        throw new OperationNotExistError(
          `Operation ${operation.name} does not exist`,
        );
      }

      if (operation.name === "nop") {
        processedOperations.push([operation]);
        continue;
      }

      const keyHandler = await authenticator.getKeyHandlerForOperation(
        operation,
      );

      if (!keyHandler) {
        throw new AuthorizationError(
          `No keyhandler registered to handle operation <${operation.name}>`,
        );
      }
      keyHandlers.push(keyHandler);
      const adId = deriveAccountId(keyHandler.authDescriptorRegistration);
      if (!nonces.has(adId.toString("hex"))) {
        nonces.set(
          adId.toString("hex"),
          (await authenticator.getNonce(adId)) || 0,
        );
      }

      const nonce = nonces.get(adId.toString("hex"));
      if (nonce || nonce === 0) {
        const ops = await keyHandler.authorize(
          authenticator.accountId,
          operation,
          nonce,
          authenticator.authDataService,
        );
        // consider keeping nonce value in corresponding key handler
        ops.forEach((op) => {
          if (op.name === "ft4.evm_auth") {
            nonces.set(adId.toString("hex"), nonce + 1);
          }
        });
        processedOperations.push(ops);
      }
    }
    let opsToReturn: Operation[] = [];
    processedOperations.forEach((item) => {
      opsToReturn = Array.isArray(item)
        ? opsToReturn.concat(item)
        : [...opsToReturn, item];
    });
    return [opsToReturn, keyHandlers];
  }

  async function build(): Promise<Buffer> {
    const tx = await this.buildUnsigned();
    await Promise.all(
      this._keyhandlersUsed.map((handler: KeyHandler) => handler.sign(tx)),
    );
    return gtx.serialize(tx);
  }

  function addSigners(...signers: KeyHandler[]): TransactionBuilder {
    signers.forEach((signer) => this._keyhandlersUsed.push(signer));
    return this;
  }

  async function buildWithSigners(...signers: KeyHandler[]) {
    const tx = await this.buildUnsigned();
    tx.signers = [
      ...new Set(signers.map((signer) => signer.getSigners()).flat()),
    ];
    await Promise.all(signers.map((handler: KeyHandler) => handler.sign(tx)));
    return gtx.serialize(tx);
  }

  async function buildAndSend(): Promise<{
    tx: SignedTransaction;
    receipt: TransactionReceipt;
  }> {
    const tx = await (this as TransactionBuilder).build();
    const receipt = await client.sendTransaction(tx);

    const operationsWithHandlers = this._operations.filter(
      (op: OperationContext) => !!op.onAnchoredHandler,
    );

    if (operationsWithHandlers.length) {
      new Promise((resolve) =>
        resolve(waitUntilAnchored(operationsWithHandlers, tx)),
      );
    }

    return {
      tx,
      receipt,
    };
  }

  async function waitUntilAnchored(operations: OperationContext[], tx: Buffer) {
    const systemClient = await createClient({
      nodeUrlPool: client.config.endpointPool.slice(),
      blockchainIid: 0,
    });
    const anchoringClient = await getAnchoringClient(
      systemClient,
      client.config.blockchainRid,
    );
    const txRid = getTransactionRid(tx);

    for (let i = 0; i < config.retryCount; ++i) {
      await new Promise((resolve) => setTimeout(resolve, config.waitTimeMs));

      let isAnchored = false;
      try {
        isAnchored = await isBlockAnchored(client, anchoringClient, txRid);
      } catch (error) {
        console.error("Error while checking block anchoring status", error);

        if (error instanceof BlockAnchoringException) {
          isAnchored = false;
        } else {
          throw error;
        }
      }

      if (isAnchored) {
        operations.forEach((op: OperationContext) => {
          if (!op.onAnchoredHandler) return;
          op.onAnchoredHandler(op.operation, tx, null);
        });
        return;
      }
    }

    operations.forEach((op) => {
      if (!op.onAnchoredHandler) return;
      op.onAnchoredHandler(
        null,
        tx,
        new AnchoringTimeoutError(
          "Block was not anchored within the specified timeout",
        ),
      );
    });
  }

  function addWithAuthenticator(
    operation: Operation,
    authenticator: Authenticator,
    handler?: OnAnchoredHandler,
  ): TransactionBuilder {
    this._operations.push({ operation, authenticator, handler });
    return this;
  }

  const context: Partial<TransactionBuilder> = {
    _operations: [],
    _keyhandlersUsed: [],
    session: client,
  };
  context.add = add.bind(context);
  context.build = build.bind(context);
  context.buildUnsigned = buildUnsigned.bind(context);
  context.addSigners = addSigners.bind(context);
  context.addWithAuthenticator = addWithAuthenticator.bind(context);
  context.buildWithSigners = buildWithSigners.bind(context);
  context.buildAndSend = buildAndSend.bind(context);

  return context as TransactionBuilder;
}
