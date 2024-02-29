import { Session } from "@ft4/index";
import { BufferId } from "@ft4/utils";
import { LoginConfigRules } from "./rules";
import { RawRules } from "@ft4/accounts/auth-descriptor/rules";
import { LoginKeyStore } from "@ft4/authentication/login-manager/stores/types";

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

export type LoginConfigOptions = {
  loginKeyStore?: LoginKeyStore;
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

export type SessionWithLogout = {
  session: Session;
  logout: () => Promise<void>;
};

export type LoginManager = {
  login: (loginOptions: LoginOptions) => Promise<SessionWithLogout>;
};

export class LoginConfigError extends Error {
  constructor(msg?) {
    super(msg);
    this.message = msg;
    this.name = "LoginConfigError";
  }
}
