import { Operation, formatter } from "postchain-client";
import { BufferId } from "../../../cryptoUtils";

export function ftAuth(
  accountId: BufferId,
  authDesriptorId: BufferId
): Operation {
  return {
    name: "ft.ft_auth",
    args: [
      formatter.ensureBuffer(accountId),
      formatter.ensureBuffer(authDesriptorId),
    ],
  };
}
