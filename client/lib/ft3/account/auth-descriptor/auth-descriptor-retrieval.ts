import { GtxClient } from "postchain-client/built/src/gtx/interfaces";
import {
  AccountAuthDescriptorsRetriever,
  AuthDescriptor,
  AuthDescriptorRule,
  AuthType,
  MultiSigAuthDescriptorArgs,
  SingleSigAuthDescriptorArgs,
} from "./types";
import { BufferId } from "/cryptoUtils";
import { formatter } from "postchain-client";
import { PagedResponse } from "/ft3/types";
import {
  AuthDescriptorError,
  createMultiSignatureAuthDescriptor,
  createSingleSignatureAuthDescriptor,
} from "./auth-descriptor";

export function createAuthDescriptorRetriever(
  session: GtxClient,
  accountId: BufferId
): AccountAuthDescriptorsRetriever {
  const id = formatter.ensureBuffer(accountId);

  return Object.freeze({
    retrieve: async (
      amount: number,
      cursor: string | null = null
    ): Promise<PagedResponse<AuthDescriptor>> => {
      if (amount > 100)
        throw new AuthDescriptorError("amount needs to be <= 100");

      const res = await session.query(
        "ft4.get_account_auth_descriptors_paginated",
        {
          id: id,
          page_size: amount,
          page_cursor: cursor,
        }
      );
      return {
        data: res.data.map(createAd),
        nextCursor: res.next_cursor,
      };
    },
    brid: session.newTransaction([]).gtx.blockchainRID.toString("hex"),
  });
}

function createAd(input: {
  args: SingleSigAuthDescriptorArgs | MultiSigAuthDescriptorArgs;
  auth_type: AuthType;
  rules: AuthDescriptorRule;
}) {
  if (
    input.auth_type === AuthType.single_sig ||
    input.auth_type === AuthType.external_single_sig
  ) {
    return createSingleSignatureAuthDescriptor(
      input.auth_type,
      input.args as SingleSigAuthDescriptorArgs,
      input.rules
    );
  }
  if (
    input.auth_type === AuthType.multi_sig ||
    input.auth_type === AuthType.external_multi_sig
  ) {
    return createMultiSignatureAuthDescriptor(
      input.auth_type,
      input.args as MultiSigAuthDescriptorArgs,
      input.rules
    );
  }
}
