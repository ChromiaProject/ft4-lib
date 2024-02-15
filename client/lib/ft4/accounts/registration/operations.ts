import { Signature } from "@ft4/authentication";
import { Operation } from "postchain-client";

export function registerAccount(): Operation {
  return {
    name: "ft4.register_account",
    args: [],
  };
}

export function registerAccountEvmSignatures(
  signatures: Signature[],
): Operation {
  return {
    name: "ft4.register_account_evm_signatures",
    args: [signatures.map(({ r, s, v }) => [r, s, v])],
  };
}
