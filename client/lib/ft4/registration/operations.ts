import { Operation } from "postchain-client";

/**
 * Produces a register_account operation.
 */
export function registerAccount(): Operation {
  return {
    name: "ft4.register_account",
    args: [],
  };
}
