import { RegistrationDetails, Strategy } from "../../types";
import {
  AnyAuthDescriptorRegistration,
  aggregateSigners,
} from "@ft4/accounts/auth-descriptor";
import { authDescriptorRegistrationToGtv } from "@ft4/accounts/auth-descriptor/gtv";
import { LoginConfigOptions } from "@ft4/authentication/login-manager";
import { Connection } from "@ft4/types";
import {
  getAccountIdFromSigners,
  getLoginDetails,
} from "@ft4/accounts/registration/strategies/index";

export const TRANSFER_STRATEGY_OPEN = "open";

export function transfer(
  transferStrategy: string,
  authDescriptor: AnyAuthDescriptorRegistration,
  loginConfig: LoginConfigOptions | null = null,
): Strategy {
  return Object.freeze({
    getRegistrationDetails: async (
      connection: Connection,
    ): Promise<RegistrationDetails> => {
      const accountId = getAccountIdFromSigners(
        aggregateSigners(authDescriptor),
      );

      const loginDetails =
        loginConfig &&
        (await getLoginDetails(connection, accountId, loginConfig));

      const operation = {
        name: "ft4.ras_transfer",
        args: [
          transferStrategy,
          authDescriptorRegistrationToGtv(authDescriptor),
          loginDetails &&
            authDescriptorRegistrationToGtv(loginDetails.authDescriptor),
        ],
      };

      return {
        strategyOperation: operation,
        loginKeyStore: loginDetails?.keyStore || null,
      };
    },
  });
}
