import { AuthDescriptorValidationService } from "@ft4/accounts/auth-descriptor/validator/types";
import { BufferId } from "@ft4/utils";

export function createFakeAuthDescriptorValidationService(params: {
  blockHeight?: number;
  nonce?: number;
}): AuthDescriptorValidationService {
  return Object.freeze({
    getNonce: (_accountId: BufferId, _authDescriptorId: BufferId) =>
      Promise.resolve(params.nonce || 0),
    getBlockHeight: () => Promise.resolve(params.blockHeight || 0),
  });
}
