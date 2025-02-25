import { TransactionReceipt } from "postchain-client";
import { OptionalPageCursor, Session } from "@ft4/ft-session";

export type EnumLike = Record<string, string | number>;

export type Config = {
  rateLimit: {
    active: 0 | 1;
    maxPoints: number;
    recoveryTime: number;
    pointsAtAccountCreation: number;
  };
  authDescriptor: {
    maxRules: number;
    maxNumberPerAccount: number;
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

export type EntityRetriever<T> = {
  /**
   * Retrieves a page of the data
   * @param limit - maximum number of entries in the returned page
   * @param cursor - where the page starts
   * @returns a page staring at cursor location and containing at most `limit` number of items.
   */
  retrieve: (
    limit?: number,
    cursor?: OptionalPageCursor,
  ) => Promise<PaginatedEntity<T>>;
};

export type PaginatedEntity<T> = {
  data: T[];
  nextCursor: OptionalPageCursor;
};

export type TxContext = { [counterId: string]: number | null };

export interface RellAppStructure {
  [modules: string]: Record<string, RellModuleStructure>;
}

export interface RellModuleStructure {
  operations?: { [key: string]: RellOperationStructure };
}

export interface RellOperationStructure {
  mount: string;
  parameters: any[];
}

export type RequireTogether<T, Keys extends keyof T> = T & {
  [K in Keys]-?: T[K];
};

export type TransactionCompletion<T = undefined> = T extends undefined
  ? { receipt: TransactionReceipt }
  : { receipt: TransactionReceipt; data: T };

export type TransactionSessionCompletion<T = undefined> = T extends undefined
  ? { receipt: TransactionReceipt; session: Session }
  : { receipt: TransactionReceipt; session: Session; data: T };

export type DeepReadonly<T> = T extends (infer R)[]
  ? DeepReadonlyArray<R>
  : T extends object
    ? DeepReadonlyObject<T>
    : T;

export interface DeepReadonlyArray<T> extends ReadonlyArray<DeepReadonly<T>> {}

type DeepReadonlyObject<T> = {
  readonly [P in keyof T]: DeepReadonly<T[P]>;
};

export type ConfigResponse = {
  rate_limit: {
    active: 0 | 1;
    max_points: number;
    recovery_time: number;
    points_at_account_creation: number;
  };
  auth_descriptor: {
    max_rules: number;
    max_number_per_account: number;
  };
};

export type Filter<T extends Record<string, any>> =
  | {
      [K in keyof T]: Array<T[K]> | null;
    }
  | undefined;
