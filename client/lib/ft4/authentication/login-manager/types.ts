import { BufferId } from "../../cryptoUtils";
import { Session } from "../../types";
import { AuthDescriptorRule } from "/ft4/accounts";

export type LoginConfig = {
  flags: string[];
  rules: LoginConfigRule | AuthDescriptorRule;
};

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

export type LoginConfigSimpleRule = readonly [number, number, string];
export type LoginConfigNullRule = null;
export type LoginConfigRule =
  | readonly ["and", ...LoginConfigSimpleRule[]]
  | LoginConfigSimpleRule
  | LoginConfigNullRule;
