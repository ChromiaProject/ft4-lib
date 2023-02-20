import { RawGtv } from "postchain-client/built/src/gtv/types";

export type Operation = [string, RawGtv[]];

export type ChainInfo = {
  name: string;
  website: string;
  description: string;
  rate_limit_active: boolean;
  rate_limit_max_points: number;
  rate_limit_recovery_time: number;
  rate_limit_points_at_account_creation: number;
};
