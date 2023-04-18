import { RawGtv } from "postchain-client/built/src/gtv/types";

export type Operation = [string, ...RawGtv[]];

export type ChainInfo = {
  name: string;
  website: string;
  description: string;
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
