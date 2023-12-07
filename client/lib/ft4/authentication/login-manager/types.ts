import { BufferId } from "../../cryptoUtils";
import { Session } from "../../types";
import { AuthDescriptorRule } from "/ft4/accounts";
import {
  RuleOperator,
  RuleVariables,
} from "/ft4/accounts/auth-descriptor/rules";

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
  variable: RuleVariables;
  operator: RuleOperator;
  value: string;
};
export type LoginConfigComplexRule = {
  operator: "and";
  rules: Rules[];
};
export type LoginConfigRules =
  | LoginConfigComplexRule
  | LoginConfigSimpleRule
  | null;

export type Rules = LoginConfigRules | AuthDescriptorRule;

export type RawLoginConfigSimpleRule = readonly [number, number, string];
export type RawLoginConfigComplexRule = readonly ["and", ...RawRules[]];
export type RawLoginConfigRules =
  | RawLoginConfigComplexRule
  | RawLoginConfigSimpleRule
  | null;

export type RawRules = RawLoginConfigRules; // | RawAuthDescriptorRule;
