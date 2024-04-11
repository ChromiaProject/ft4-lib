import { Operation } from "postchain-client";

export function registerAccount(): Operation {
  return {
    name: "ft4.register_account",
    args: [],
  };
}
