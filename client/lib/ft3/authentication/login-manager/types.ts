import { BufferId } from "/cryptoUtils";
import { Session } from "/ft3/types";

export type LoginOptions = {
  accountId: BufferId;
  flags?: string[];
};

export type LoginManger = {
  login: (options: LoginOptions) => Promise<Session>;
  logout: () => void;
};
