import { RawGtv, RellOperation } from "postchain-client";
import { OptionalPageCursor } from "../types";
import { Buffer } from "buffer";

export type Operation = [string, ...RawGtv[]];

export type Config = {
  rate_limit: {
    active: 0 | 1;
    max_points: number;
    recovery_time: number;
    points_at_account_creation: number;
  };
};

export type ConnectionCallbackParams = {
  accounts: string[];
  chainId: number;
};

export type ExternalWalletConnection = {
  connectionUri: string;
  getAccounts: () => string[];
  signMessage: ({
    message,
    account,
  }: {
    message: string;
    account: string;
  }) => Promise<string>;
};

export type Query = [string, { [property: string]: RawGtv }];

export type QueryObject = {
  name: string;
  args: { [property: string]: RawGtv };
};

export function freeze<T>(object: T): T {
  return Object.freeze(object);
}

export type EntityRetriever<T> = {
  retrieve: (
    limit?: number,
    cursor?: OptionalPageCursor
  ) => Promise<PaginatedEntity<T>>;
};

export type PaginatedEntity<T> = {
  data: T[];
  nextCursor: OptionalPageCursor;
};

export type TxBuilderTransaction = {
  blockchainRID: Buffer;
  operations: RellOperation[];
  signers: Buffer[];
  signatures: Buffer[];
};
