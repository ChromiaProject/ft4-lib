import { RawGtv } from "postchain-client/built/src/gtv/types";
import { OptionalPageCursor } from "../types";

export type Operation = [string, ...RawGtv[]];

export type Config = {
  rate_limit_active: 0 | 1;
  rate_limit_max_points: number;
  rate_limit_recovery_time: number;
  rate_limit_points_at_account_creation: number;
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

export type EntityRetreiver<T> = {
  retrieve: (
    limit?: number,
    cursor?: OptionalPageCursor
  ) => Promise<PaginatedEntity<T[]>>;
};

export type PaginatedEntity<T extends any[]> = {
  data: T;
  nextCursor: OptionalPageCursor;
};
