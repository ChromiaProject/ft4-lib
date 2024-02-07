import { BufferId } from "@ft4/utils";
import { AnyAuthDescriptor } from "../types";

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
   * Gets nonce for provided account and auth descriptor
   * @param accountId
   * @param authDescriptorId
   * @returns auth descriptor nonce or null
   */
  getNonce: (
    accountId: BufferId,
    authDescriptorId: BufferId,
  ) => Promise<number | null>;
}
