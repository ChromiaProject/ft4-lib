import { Session } from "@ft4/ft-session";
import { BufferId } from "@ft4/utils";
import { LoginConfigRules } from "./rules";
import { RawRules } from "@ft4/accounts";
import { LoginKeyStore } from "./stores";

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
  /**
   * Deletes the disposable auth descriptor from the account, making the account inaccessible to this key.
   */
  logout: () => Promise<void>;
};

export class LoginConfigError extends Error {
  constructor(msg?) {
    super(msg);
    this.message = msg;
    this.name = "LoginConfigError";
  }
}
