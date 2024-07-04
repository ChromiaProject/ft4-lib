import { AnyAuthDescriptor } from "@ft4/accounts";
import { BufferId } from "@ft4/utils";

export type AuthDescriptorValidator = {
  /**
   * Verifies if the auth descriptor is active or not.
   * An auth descriptor is active if it has been enforced
   * at least once. I.e., an auth descriptor will be active
   * and expired at the same time when it expire. The only time
   * an auth descriptor will not be active is if it has rules
   * such that it will become valid in the future.
   * @param authDescriptor - the auth descriptor to check
   */
  isActive: (authDescriptor: AnyAuthDescriptor) => Promise<boolean>;
  /**
   * Verifies if the auth descriptor has expired or not.
   * An auth descriptor has expired if the rules specified
   * by the auth descriptor are violated in such a way that
   * they will never be valid again, e.g., maximum number
   * of operations reached.
   * @param authDescriptor - the auth descriptor to check
   */
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
