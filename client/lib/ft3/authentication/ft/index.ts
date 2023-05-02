import { formatter } from "postchain-client";
import { BufferId } from "../../../cryptoUtils";
import { Operation } from "../../utils/types";

export function ftAuth(
  accountId: BufferId,
  authDesriptorId: BufferId
): Operation {
  return [
    "ft.ft_auth",
    [
      formatter.ensureBuffer(accountId),
      formatter.ensureBuffer(authDesriptorId),
    ],
  ];
}
