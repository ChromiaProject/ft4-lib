import { BufferId } from "../../cryptoUtils";
import { Session } from "../../types";
import { AuthDescriptorRule } from "/ft4/accounts";

export type LoginConfig = {
  flags: string[];
} & (
  | {
      ttl: number;
      rules?: never;
    }
  | {
      ttl?: never;
      rules: AuthDescriptorRule;
    }
  | {
      ttl?: never;
      rules?: never;
    }
);

export type LoginOptions = {
  accountId: BufferId;
} & (
  | {
      configName: string;
      config?: never;
    }
  | {
      configName?: never;
      config: LoginConfig;
    }
  | {
      configName?: never;
      config?: never;
    }
);

export type LoginManager = {
  login: (loginOptions: LoginOptions) => Promise<Session>;
  logout: (accountId: Buffer) => void;
};
