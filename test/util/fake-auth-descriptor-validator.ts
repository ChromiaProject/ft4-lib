import { AuthDescriptorValidationService } from "@ft4/accounts";
import { BufferId } from "@ft4/utils";

export function createFakeAuthDescriptorValidationService(params: {
  blockHeight?: number;
  authDescriptorCounter?: number;
}): AuthDescriptorValidationService {
  return Object.freeze({
    getAuthDescriptorCounter: (
      _accountId: BufferId,
      _authDescriptorId: BufferId,
    ) => Promise.resolve(params.authDescriptorCounter || 0),
    getBlockHeight: () => Promise.resolve(params.blockHeight || 0),
  });
}
