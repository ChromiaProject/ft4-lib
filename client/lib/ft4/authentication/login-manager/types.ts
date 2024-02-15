import { Session } from "@ft4/index";
import { Buffer } from "buffer";
import { BufferId } from "@ft4/utils";
import { LoginConfigRules } from "./rules";
import { RawRules } from "@ft4/accounts/auth-descriptor/rules";

export type LoginConfig = {
  flags: string[];
  rules: LoginConfigRules | null;
};

export type RawLoginConfig = {
  flags: string[];
  rules: RawRules | null;
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
