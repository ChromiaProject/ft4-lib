import { Amount } from "@ft4/asset";
import {
  Authenticator,
  KeyStore,
  createAuthenticator,
} from "@ft4/authentication";
import { BufferId, TransactionSessionCompletion } from "@ft4/utils";
import { formatter, SignedTransaction, Web3PromiEvent } from "postchain-client";
import {
  TransactionWithReceipt,
  transactionBuilder,
} from "@ft4/transaction-builder";
import {
  addAuthDescriptor as addAuthDescriptorOp,
  burn as burnOp,
  deleteAuthDescriptor as deleteAuthDescriptorOp,
  transfer as transferOp,
  recallUnclaimedTransfer as recallUnclaimedTransferOp,
} from "./operations";
import { authDescriptorById } from "./queries";
import { createAccountObject } from "./query-functions";
import {
  AnyAuthDescriptorRegistration,
  deriveAuthDescriptorId,
  gtv,
} from "./auth-descriptor";
import { AuthenticatedAccount } from "./types";
import {
  TransferRef,
  crosschainTransfer,
  resumeCrosschainTransfer,
  recallUnclaimedCrosschainTransfer,
} from "@ft4/crosschain";
import { Connection, call, createSession } from "@ft4/ft-session";
import { revertCrosschainTransfer } from "@ft4/crosschain/transfer";

export function createAuthenticatedAccount(
  connection: Connection,
  authenticator: Authenticator,
): AuthenticatedAccount {
  return Object.freeze({
    authenticator,
    addAuthDescriptor: (
      authDescriptor: AnyAuthDescriptorRegistration,
      keyStore: KeyStore,
    ) => addAuthDescriptor(connection, authenticator, authDescriptor, keyStore),
    deleteAuthDescriptor: (authDescriptorId: BufferId) =>
      deleteAuthDescriptor(connection, authenticator, authDescriptorId),
    // deleteAllAuthDescriptorsExclude: (authDescriptorId: BufferId) =>
    //   _deleteAllAuthDescriptorsExclude(connection, authenticator, authDescriptorId),
    transfer: (receiverId: BufferId, assetId: BufferId, amount: Amount) =>
      transfer(connection, authenticator, receiverId, assetId, amount),
    recallUnclaimedTransfer: (txRid: BufferId, opIndex: number) =>
      recallUnclaimedTransfer(connection, authenticator, txRid, opIndex),
    crosschainTransfer: (
      targetChainId: BufferId,
      recipientId: BufferId,
      assetId: BufferId,
      amount: Amount,
    ) =>
      crosschainTransfer(
        connection,
        authenticator,
        targetChainId,
        recipientId,
        assetId,
        amount,
      ),
    resumeCrosschainTransfer: (pendingTransfer: TransferRef) =>
      resumeCrosschainTransfer(connection, authenticator, pendingTransfer),
    revertCrosschainTransfer: (pendingTransfer: TransferRef) =>
      revertCrosschainTransfer(connection, authenticator, pendingTransfer),
    recallUnclaimedCrosschainTransfer: (pendingTransfer: TransferRef) =>
      recallUnclaimedCrosschainTransfer(
        connection,
        authenticator,
        pendingTransfer,
      ),
    burn: (assetId: BufferId, amount: Amount) =>
      burn(connection, authenticator, assetId, amount),
    ...createAccountObject(connection, authenticator.accountId),
  });
}

function addAuthDescriptor(
  connection: Connection,
  authenticator: Authenticator,
  authDescriptorRegistration: AnyAuthDescriptorRegistration,
  keyStore: KeyStore,
): Web3PromiEvent<
  TransactionSessionCompletion,
  {
    built: SignedTransaction;
    sent: Buffer;
  }
> {
  const promiEvent = new Web3PromiEvent<
    TransactionSessionCompletion,
    {
      built: SignedTransaction;
      sent: Buffer;
    }
  >((resolve, reject) => {
    transactionBuilder(authenticator, connection.client)
      .add(addAuthDescriptorOp(authDescriptorRegistration), {
        signers: [keyStore],
      })
      .buildAndSend()
      .on("built", (tx) => promiEvent.emit("built", tx))
      .on("sent", (txRid) => promiEvent.emit("sent", txRid))
      .then(({ receipt }) =>
        Promise.all([
          receipt,
          connection.query(
            authDescriptorById(
              authenticator.accountId,
              deriveAuthDescriptorId(authDescriptorRegistration),
            ),
          ),
        ]),
      )
      .then(([receipt, ad]) => {
        const newAuth = createAuthenticator(
          authenticator.accountId,
          authenticator.keyHandlers.concat(
            keyStore.createKeyHandler(gtv.authDescriptorFromGtv(ad)),
          ),
          authenticator.authDataService,
        );
        resolve({
          receipt,
          session: createSession(connection, newAuth),
        });
      })
      .catch((reason) => reject(reason));
  });
  return promiEvent;
}

function deleteAuthDescriptor(
  connection: Connection,
  authenticator: Authenticator,
  authDescriptorId: BufferId,
): Web3PromiEvent<
  TransactionSessionCompletion,
  {
    built: SignedTransaction;
    sent: Buffer;
  }
> {
  const promiEvent = new Web3PromiEvent<
    TransactionSessionCompletion,
    {
      built: SignedTransaction;
      sent: Buffer;
    }
  >((resolve, reject) => {
    const newAuth = createAuthenticator(
      authenticator.accountId,
      authenticator.keyHandlers.filter((kh) =>
        kh.authDescriptor.id.compare(formatter.ensureBuffer(authDescriptorId)),
      ),
      authenticator.authDataService,
    );
    call(connection, authenticator, deleteAuthDescriptorOp(authDescriptorId))
      .on("built", (tx) => promiEvent.emit("built", tx))
      .on("sent", (txRid) => promiEvent.emit("sent", txRid))
      .then(({ receipt }) => {
        resolve({
          receipt,
          session: createSession(connection, newAuth),
        });
      })
      .catch((reason) => reject(reason));
  });
  return promiEvent;
}

function transfer(
  connection: Connection,
  authenticator: Authenticator,
  receiverId: BufferId,
  assetId: BufferId,
  amount: Amount,
): Web3PromiEvent<
  TransactionWithReceipt,
  {
    built: SignedTransaction;
    sent: Buffer;
  }
> {
  return call(
    connection,
    authenticator,
    transferOp(receiverId, assetId, amount),
  );
}

function recallUnclaimedTransfer(
  connection: Connection,
  authenticator: Authenticator,
  txRid: BufferId,
  opIndex: number,
): Web3PromiEvent<
  TransactionWithReceipt,
  {
    built: SignedTransaction;
    sent: Buffer;
  }
> {
  return call(
    connection,
    authenticator,
    recallUnclaimedTransferOp(txRid, opIndex),
  );
}

function burn(
  connection: Connection,
  authenticator: Authenticator,
  assetId: BufferId,
  amount: Amount,
): Web3PromiEvent<
  TransactionWithReceipt,
  {
    built: SignedTransaction;
    sent: Buffer;
  }
> {
  return call(connection, authenticator, burnOp(assetId, amount));
}
