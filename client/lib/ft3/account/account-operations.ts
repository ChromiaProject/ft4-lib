import { op } from "../utils";
import { IAuthenticatedAccount, XferInput, XferOutput } from "./types";
import { Operation } from "../utils/types";
import { authDescriptor as authDesc } from "./auth-descriptor";
import { AuthDescriptor } from "./auth-descriptor/types";
import { Connection } from "../interfaces";
import { Authenticator } from "../authentication/interfaces";
import { createAccountObject } from "./account-query-functions";
import { BufferId, KeyPair } from "../../cryptoUtils";
import { transactionBuilder } from "../utils/transaction-builder";
import { createInMemoryFTKeyStore } from "../authentication/ft/key-stores/in-memory";
import { formatter } from "postchain-client";

export function addAuthDescriptorOp(
  accountId: Buffer,
  authDescriptorId: Buffer,
  authDescriptor: AuthDescriptor
): Operation {
  return op(
    "ft3.add_auth_descriptor",
    accountId,
    authDescriptorId,
    authDesc.toGtv(authDescriptor)
  );
}

export function transferOp(
  inputs: XferInput[],
  outputs: XferOutput[]
): Operation {
  return op("ft3.transfer", inputs, outputs);
}

export function xcTransferOp /*
  source: GtvCompatible,
  target: GtvCompatible,
  hops: Array<Buffer>*/(): Operation {
  throw new Error("Not implemented!");
  //return op("ft3.xc.init_xfer", source, target, hops);
}

export function deleteAllAuthDescriptorsExcludeOp(
  accountId: Buffer,
  excludeAuthDescriptorId: Buffer
): Operation {
  return op(
    "ft3.delete_all_auth_descriptors_exclude",
    accountId,
    excludeAuthDescriptorId
  );
}

export function deleteAuthDescriptorOp(
  accountId: Buffer,
  authDescriptorId: Buffer,
  deleteAuthDescriptorId: Buffer
): Operation {
  return op(
    "ft3.delete_auth_descriptor",
    accountId,
    authDescriptorId,
    deleteAuthDescriptorId
  );
}

export function addAuthDescriptorV2(authDescriptor: AuthDescriptor): Operation {
  return op("ft3.add_auth_descriptor_v2", [authDesc.toGtv(authDescriptor)]);
}

export function deleteAuthDescriptorV2(authDescriptorId: BufferId): Operation {
  return op("ft3.delete_auth_descriptor_v2", [
    formatter.ensureBuffer(authDescriptorId),
  ]);
}

export function createAuthenticatedAccount(
  connection: Connection,
  authenticator: Authenticator
): IAuthenticatedAccount {
  return {
    ...createAccountObject(connection, authenticator.accountId),
    addAuthDescriptor: (authDescriptor: AuthDescriptor, keyPair: KeyPair) =>
      addAuthDescriptor(connection, authenticator, authDescriptor, keyPair),
    deleteAuthDescriptor: (authDescriptorId: BufferId) =>
      deleteAuthDescriptor(connection, authenticator, authDescriptorId),
  };
}

async function addAuthDescriptor(
  connection: Connection,
  authenticator: Authenticator,
  authDescriptor: AuthDescriptor,
  keyPair: KeyPair
): Promise<void> {
  const tb = transactionBuilder(authenticator, connection.client);

  const tx = await tb
    .add(addAuthDescriptorV2(authDescriptor))
    .addSigners(
      createInMemoryFTKeyStore(keyPair).createKeyHandler(authDescriptor)
    )
    .build();

  return tx.postAndWaitConfirmation();
}

async function deleteAuthDescriptor(
  connection: Connection,
  authenticator: Authenticator,
  authDescriptorId: BufferId
): Promise<void> {
  return call(
    connection,
    authenticator,
    deleteAuthDescriptorV2(authDescriptorId)
  );
}

async function call(
  connection: Connection,
  authenticator: Authenticator,
  ...operations: Operation[]
): Promise<void> {
  const tb = transactionBuilder(authenticator, connection.client);
  operations.forEach((operation: Operation) => tb.add(operation));
  const tx = await tb.build();
  return tx.postAndWaitConfirmation();
}
