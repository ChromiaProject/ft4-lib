import { AuthDescriptorRules, RuleOperator, RuleVariable } from "@ft4/accounts";
import {
  AuthDescriptorSimpleRule,
  RawAuthDescriptorSimpleRule,
} from "@ft4/accounts/auth-descriptor/types";
import { Session } from "@ft4/index";
import { BufferId } from "@ft4/utils";

export type LoginConfig = {
  flags: string[];
  rules: Rules | null;
};

export type LoginOptions = {
  accountId: BufferId;
} & LoginConfigOptions;

export type LoginConfigOptions =
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
    };

export type LoginManager = {
  login: (loginOptions: LoginOptions) => Promise<Session>;
  logout: (accountId: Buffer) => void;
};

export class LoginConfigError extends Error {
  constructor(msg?) {
    super(msg);
    this.message = msg;
    this.name = "LoginConfigError";
  }
}

export type LoginConfigSimpleRule = {
  variable: RuleVariable;
  operator: RuleOperator;
  value: `${number}` | `{${number}}`;
};
export type LoginConfigComplexRule = {
  operator: "and";
  rules: LoginConfigSimpleRule[];
};
export type LoginConfigRules = LoginConfigComplexRule | LoginConfigSimpleRule;

export type Rules = LoginConfigRules | AuthDescriptorRules;

export type RawLoginConfigSimpleRule = readonly [
  string,
  string,
  `${number}` | `{${number}}`,
];
export type RawLoginConfigComplexRule = readonly ["and", ...RawRules[]];
export type RawLoginConfigRules =
  | RawLoginConfigComplexRule
  | RawLoginConfigSimpleRule
  | null;

export type RawRules = RawLoginConfigRules | RawAuthDescriptorSimpleRule;

export type AnySimpleRule = LoginConfigSimpleRule | AuthDescriptorSimpleRule;
export type RawAnySimpleRule =
  | RawLoginConfigSimpleRule
  | RawAuthDescriptorSimpleRule;
