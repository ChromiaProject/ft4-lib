import { AnyAuthDescriptor } from "@ft4/accounts";
import { BufferId } from "@ft4/utils";

export type AuthDescriptorValidator = {
  isActive: (authDescriptor: AnyAuthDescriptor) => Promise<boolean>;
  hasExpired: (authDescriptor: AnyAuthDescriptor) => Promise<boolean>;
};

/**
 * Interface used by auth descriptor validation to fetch dynamic parameters from blockchain
 */
export interface AuthDescriptorValidationService {
  /**
   * Gets block height
   * @returns block height
   */
  getBlockHeight: () => Promise<number>;

  /**
   * Gets auth descriptor counter for provided account and auth descriptor
   * @param accountId - The account id to get counter for
   * @param authDescriptorId - The id of the auth descriptor to get counter for
   * @returns auth descriptor counter or null
   */
  getAuthDescriptorCounter: (
    accountId: BufferId,
    authDescriptorId: BufferId,
  ) => Promise<number | null>;
}
