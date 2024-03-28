import { AnyAuthDescriptorRegistration, gtv } from "@ft4/accounts";
import { LoginConfigOptions } from "@ft4/authentication";
import { RegistrationDetails, Strategy } from "@ft4/registration";
import { Connection } from "@ft4/ft-session";
import { fetchLoginDetails } from "./main";

export function open(
  authDescriptor: AnyAuthDescriptorRegistration,
  loginConfig: LoginConfigOptions | null = null,
): Strategy {
  return Object.freeze({
    getRegistrationDetails: async (
      connection: Connection,
    ): Promise<RegistrationDetails> => {
      const { loginDetails } = await fetchLoginDetails(
        connection,
        authDescriptor,
        loginConfig,
      );

      const operation = {
        name: "ft4.ras_open",
        args: [
          gtv.authDescriptorRegistrationToGtv(authDescriptor),
          loginDetails &&
            gtv.authDescriptorRegistrationToGtv(loginDetails.authDescriptor),
        ],
      };

      return {
        strategyOperation: operation,
        loginKeyStore: loginDetails?.loginKeyStore || null,
        disposableKeyStore: loginDetails?.disposableKeyStore || null,
      };
    },
  });
}
