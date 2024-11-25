import { Amount } from "@ft4/asset";
import {
  Authenticator,
  KeyStore,
  createAuthenticator,
  days,
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
  deleteAllAuthDescriptorsExceptMain as deleteAllAuthDescriptorsExceptMainOp,
  deleteAuthDescriptor as deleteAuthDescriptorOp,
  updateMainAuthDescriptor as updateMainAuthDescriptorOp,
  transfer as transferOp,
  recallUnclaimedTransfer as recallUnclaimedTransferOp,
} from "./operations";
import {
  createAccountObject,
  getAccountMainAuthDescriptor,
  getAuthDescriptorById,
} from "./query-functions";
import {
  AuthDescriptorRegistration,
  SingleSig,
  deriveAuthDescriptorId,
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

/**
 * Creates an authenticated account instance
 * @param connection - the connection to the blockchain where this account is registered
 * @param authenticator - authenticator which holds the keys for this account
 */
export function createAuthenticatedAccount(
  connection: Connection,
  authenticator: Authenticator,
): AuthenticatedAccount {
  return Object.freeze({
    authenticator,
    addAuthDescriptor: (
      authDescriptor: AuthDescriptorRegistration<SingleSig>,
      keyStore: KeyStore,
    ) => addAuthDescriptor(connection, authenticator, authDescriptor, keyStore),
    updateMainAuthDescriptor: (
      authDescriptor: AuthDescriptorRegistration<SingleSig>,
      keyStore: KeyStore,
    ) =>
      updateMainAuthDescriptor(
        connection,
        authenticator,
        authDescriptor,
        keyStore,
      ),
    deleteAuthDescriptor: (authDescriptorId: BufferId) =>
      deleteAuthDescriptor(connection, authenticator, authDescriptorId),
    deleteAllAuthDescriptorsExceptMain: () =>
      deleteAllAuthDescriptorsExceptMain(connection, authenticator),
    transfer: (receiverId: BufferId, assetId: BufferId, amount: Amount) =>
      transfer(connection, authenticator, receiverId, assetId, amount),
    recallUnclaimedTransfer: (txRid: BufferId, opIndex: number) =>
      recallUnclaimedTransfer(connection, authenticator, txRid, opIndex),
    crosschainTransfer: (
      targetChainId: BufferId,
      recipientId: BufferId,
      assetId: BufferId,
      amount: Amount,
      ttl: number = days(1),
    ) =>
      crosschainTransfer(
        connection,
        authenticator,
        targetChainId,
        recipientId,
        assetId,
        amount,
        ttl,
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
  authDescriptor: AuthDescriptorRegistration<SingleSig>,
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
      .add(addAuthDescriptorOp(authDescriptor), {
        signers: [keyStore],
      })
      .buildAndSend()
      .on("built", (tx) => promiEvent.emit("built", tx))
      .on("sent", (txRid) => promiEvent.emit("sent", txRid))
      .then(({ receipt }) =>
        Promise.all([
          receipt,
          getAuthDescriptorById(
            connection,
            authenticator.accountId,
            deriveAuthDescriptorId(authDescriptor),
          ),
        ]),
      )
      .then(([receipt, ad]) => {
        const newAuth = createAuthenticator(
          authenticator.accountId,
          authenticator.keyHandlers.concat(keyStore.createKeyHandler(ad)),
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

function updateMainAuthDescriptor(
  connection: Connection,
  authenticator: Authenticator,
  authDescriptor: AuthDescriptorRegistration<SingleSig>,
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
    getAccountMainAuthDescriptor(connection, authenticator.accountId)
      .then((oldMainAuthDescriptor) =>
        Promise.all([
          oldMainAuthDescriptor,
          transactionBuilder(authenticator, connection.client)
            .add(updateMainAuthDescriptorOp(authDescriptor), {
              signers: [keyStore],
            })
            .buildAndSend()
            .on("built", (tx) => promiEvent.emit("built", tx))
            .on("sent", (txRid) => promiEvent.emit("sent", txRid)),
        ]),
      )
      .then(([oldMainAuthDescriptor, { receipt }]) =>
        Promise.all([
          oldMainAuthDescriptor,
          receipt,
          getAuthDescriptorById(
            connection,
            authenticator.accountId,
            deriveAuthDescriptorId(authDescriptor),
          ),
        ]),
      )
      .then(([oldMainAuthDescriptor, receipt, newMainAuthDescriptor]) => {
        const keyHandlers = authenticator.keyHandlers
          .filter(
            ({ authDescriptor }) =>
              !authDescriptor.id.equals(oldMainAuthDescriptor.id),
          )
          .concat(keyStore.createKeyHandler(newMainAuthDescriptor));

        const newAuth = createAuthenticator(
          authenticator.accountId,
          keyHandlers,
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
      authenticator.keyHandlers.filter(
        (kh) =>
          !kh.authDescriptor.id.equals(
            formatter.ensureBuffer(authDescriptorId),
          ),
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

function deleteAllAuthDescriptorsExceptMain(
  connection: Connection,
  authenticator: Authenticator,
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
    getAccountMainAuthDescriptor(connection, authenticator.accountId)
      .then((mainAuthDescriptor) => {
        const newAuthenticator = createAuthenticator(
          authenticator.accountId,
          authenticator.keyHandlers.filter(({ authDescriptor }) =>
            authDescriptor.id.equals(mainAuthDescriptor.id),
          ),
          authenticator.authDataService,
        );

        call(connection, authenticator, deleteAllAuthDescriptorsExceptMainOp())
          .on("built", (tx) => promiEvent.emit("built", tx))
          .on("sent", (txRid) => promiEvent.emit("sent", txRid))
          .then(({ receipt }) => {
            resolve({
              receipt,
              session: createSession(connection, newAuthenticator),
            });
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
