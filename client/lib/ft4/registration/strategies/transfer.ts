import { AnyAuthDescriptorRegistration, gtv } from "@ft4/accounts";
import { Asset } from "@ft4/asset";
import { LoginConfigOptions } from "@ft4/authentication";
import { Connection } from "@ft4/ft-session";
import { RegistrationDetails, Strategy } from "@ft4/registration";
import { fetchLoginDetails } from "./main";

/**
 * {@inheritDoc registration.RegistrationStrategy.transferFee}
 */
export function transferFee(
  feeAsset: Asset,
  authDescriptor: AnyAuthDescriptorRegistration,
  loginConfig: LoginConfigOptions | null = null,
): Strategy {
  return Object.freeze({
    requiresSignature: true,
    getRegistrationDetails: async (
      connection: Connection,
    ): Promise<RegistrationDetails> => {
      const { loginDetails } = await fetchLoginDetails(
        connection,
        authDescriptor,
        loginConfig,
      );

      const operation = {
        name: "ft4.ras_transfer_fee",
        args: [
          feeAsset.id,
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

/**
 * {@inheritDoc registration.RegistrationStrategy.transferOpen}
 */
export function transferOpen(
  authDescriptor: AnyAuthDescriptorRegistration,
  loginConfig: LoginConfigOptions | null = null,
): Strategy {
  return Object.freeze({
    requiresSignature: true,
    getRegistrationDetails: async (
      connection: Connection,
    ): Promise<RegistrationDetails> => {
      const { loginDetails } = await fetchLoginDetails(
        connection,
        authDescriptor,
        loginConfig,
      );

      const operation = {
        name: "ft4.ras_transfer_open",
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

/**
 * {@inheritDoc registration.RegistrationStrategy.subscription}
 */
export function transferSubscription(
  subscriptionAsset: Asset,
  authDescriptor: AnyAuthDescriptorRegistration,
  loginConfig: LoginConfigOptions | null = null,
): Strategy {
  return Object.freeze({
    requiresSignature: true,
    getRegistrationDetails: async (
      connection: Connection,
    ): Promise<RegistrationDetails> => {
      const { loginDetails } = await fetchLoginDetails(
        connection,
        authDescriptor,
        loginConfig,
      );

      const operation = {
        name: "ft4.ras_transfer_subscription",
        args: [
          subscriptionAsset.id,
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
