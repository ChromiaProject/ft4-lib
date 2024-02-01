import { Operation } from "postchain-client";
import { Strategy } from "../../types";
import { AnyAuthDescriptorRegistration } from "@ft4/accounts/auth-descriptor";
import { gtv } from "@ft4/accounts/auth-descriptor";

export function open(
  authDescriptor: AnyAuthDescriptorRegistration,
  disposableAuthDescriptor: AnyAuthDescriptorRegistration | null = null,
): Strategy {
  const ad =
    disposableAuthDescriptor &&
    gtv.authDescriptorRegistrationToGtv(disposableAuthDescriptor);
  return Object.freeze({
    getOperation: (): Promise<Operation> => {
      return Promise.resolve({
        name: "ft4.ras_open",
        args: [gtv.authDescriptorRegistrationToGtv(authDescriptor), ad],
      });
    },
  });
}
