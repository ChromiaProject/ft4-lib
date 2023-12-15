import { Session } from "@ft4/types";
import { BufferId } from "@ft4/utils/types";
import { AuthDescriptorRules, RuleOperator, RuleVariable } from "@ft4/accounts";
import {
  AuthDescriptorSimpleRule,
  RawAuthDescriptorSimpleRule,
} from "@ft4/accounts/auth-descriptor/types";

export type LoginConfig = {
  flags: string[];
  rules: Rules;
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
  value: string;
};
export type LoginConfigComplexRule = {
  operator: "and";
  rules: AnySimpleRule[];
};
export type LoginConfigRules =
  | LoginConfigComplexRule
  | LoginConfigSimpleRule
  | null;

export type Rules = LoginConfigRules | AuthDescriptorRules;

export type RawLoginConfigSimpleRule = readonly [number, number, string];
export type RawLoginConfigComplexRule = readonly ["and", ...RawRules[]];
export type RawLoginConfigRules =
  | RawLoginConfigComplexRule
  | RawLoginConfigSimpleRule
  | null;

export type RawRules = RawLoginConfigRules | RawAuthDescriptorSimpleRule;
export type AnySimpleRule =
  | RawLoginConfigSimpleRule
  | LoginConfigSimpleRule
  | RawAuthDescriptorSimpleRule
  | AuthDescriptorSimpleRule;
