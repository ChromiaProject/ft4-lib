import { BufferId } from "@ft4/utils";
import { ensureString } from "@ft4/authentication/login/stores/browser-login-keystore";
import { Asset } from "@ft4/asset";
import {
  AssetLimit,
  TransferAssets,
  TransferParticipants,
  TransferSenderBlockchains,
  TransferStrategyRuleAmount,
} from "@ft4/registration/types";
import { Account } from "@ft4/accounts";
import {
  REGISTRATION_STRATEGY_ALL,
  REGISTRATION_STRATEGY_CURRENT,
} from "./constants";

// Todo remove once it is properly exported from postchain-client
// currently only exported from /built/
export function toBuffer(key: string): Buffer {
  return Buffer.from(key, "hex");
}

// Todo remove once it is properly exported from postchain-client
// currently only exported from /built/
export function ensureBuffer(value: BufferId): Buffer {
  if (value instanceof Buffer) {
    return value;
  } else {
    return toBuffer(value);
  }
}

/**
 * Validates registration strategy rules for transfers
 *
 * @param rules - The rules to find the valid rules from.
 * @param senderAccount - The senders Account.
 * @param asset - The asset that is subject to transfer
 * @param isPendingTransfer - Whether the transfer is already pending
 * @param pendingTransferAmount - The amount of the pending transfer
 *
 * @returns The lowest amount or 0 if no valid rules are found.
 */
export async function validateRegistrationStrategyRules(
  rules: TransferStrategyRuleAmount[] | undefined,
  senderAccount: Account,
  asset: Asset,
  isPendingTransfer: boolean,
  pendingTransferAmount: bigint | null,
): Promise<void> {
  if (!rules || rules.length === 0) {
    return undefined;
  }

  let validRules: TransferStrategyRuleAmount[] = [];
  const senderBalance = await senderAccount.getBalanceByAssetId(asset.id);

  if (!isPendingTransfer) {
    if (!senderBalance) {
      throw new Error("Sender's balance not found. Registration failed.");
    }

    validRules = getValidRules(
      rules,
      senderAccount,
      senderBalance.asset,
      senderBalance.amount.value,
    );

    const ruleWithSmallestAmount = validRules.reduce((prev, current) =>
      current.minAmount < prev.minAmount ? current : prev,
    );

    if (senderBalance.amount.value < ruleWithSmallestAmount.minAmount) {
      throw new Error("Insufficient balance. Registration failed.");
    }
  } else {
    validRules = getValidRules(
      rules,
      senderAccount,
      asset,
      pendingTransferAmount ?? BigInt(0),
    );
  }

  if (validRules.length === 0) {
    throw new Error("No valid rules found. Registration failed.");
  }
}

/**
 * Validates the received rules based on the sender blockchain, sender and recipient account id
 * while it ensures if the sender balance is enough to cover the min amount of the rule.
 *
 * @param rules - The rules to get the valid rules from.
 * @param senderAccount - The sender account.
 * @param asset - The asset that is subject to transfer
 * @param senderBalanceAmountValue - The sender balance amount value of the asset.
 *
 * @returns The valid rules, which can be none, one or multiple.
 */
export function getValidRules(
  rules: TransferStrategyRuleAmount[],
  senderAccount: Account,
  asset: Asset,
  senderBalanceAmountValue: bigint,
): TransferStrategyRuleAmount[] {
  return rules.filter((rule) => {
    const isValidBlockchain = isValidSenderBlockchainRule(
      rule.senderBlockchains,
      senderAccount.blockchainRid,
    );
    const isValidSender = isValidParticipantRule(
      rule.senders,
      senderAccount.id,
    );
    const isValidRecipient = isValidParticipantRule(
      rule.recipients,
      senderAccount.id,
    );

    const isValidAsset = isValidAssetRule(rule.assets, asset);
    const isSenderBalanceEnough = senderBalanceAmountValue >= rule.minAmount;

    return (
      isValidBlockchain &&
      isValidSender &&
      isValidRecipient &&
      isValidAsset &&
      isSenderBalanceEnough
    );
  });
}

/**
 * Validates the participant rules for the provided rules
 *
 * @param ruleParticipant - The participant rules to validate. Does not handle the current participant.
 * @param accountId - The account ID to validate against against the rule participants
 *
 * @returns A boolean value indicating if the participant rule is valid.
 */
export function isValidParticipantRule(
  ruleParticipant: TransferParticipants,
  accountId: BufferId,
): boolean {
  if (ruleParticipant !== REGISTRATION_STRATEGY_ALL) {
    if (ruleParticipant !== REGISTRATION_STRATEGY_CURRENT) {
      if (Buffer.isBuffer(ruleParticipant)) {
        if (ensureString(ruleParticipant) !== ensureString(accountId)) {
          return false;
        }
      }

      if (Array.isArray(ruleParticipant)) {
        if (!ruleParticipant.includes(ensureBuffer(accountId))) {
          return false;
        }
      }
    }
  }

  return true;
}

/**
 * Validates the sender blockchains for the provided rules
 *
 * @param ruleSenderBlockchains - The sender blockchain rules to validate.
 * @param senderBlockchainRid - The sender blockchain rid to compare againsts the rules.
 *
 * @returns A boolean value indicating if the sender blockchain rule is valid.
 */
export function isValidSenderBlockchainRule(
  ruleSenderBlockchains: TransferSenderBlockchains,
  senderBlockchainRid: BufferId,
): boolean {
  if (ruleSenderBlockchains !== REGISTRATION_STRATEGY_ALL) {
    if (
      Buffer.isBuffer(ruleSenderBlockchains) ||
      typeof ruleSenderBlockchains === "string"
    ) {
      if (
        Buffer.compare(
          ruleSenderBlockchains,
          ensureBuffer(senderBlockchainRid),
        ) !== 0
      ) {
        return false;
      }
    }

    if (Array.isArray(ruleSenderBlockchains)) {
      if (
        !ruleSenderBlockchains.some(
          (rule) =>
            Buffer.compare(rule, ensureBuffer(senderBlockchainRid)) === 0,
        )
      ) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Validates the asset for the provided rules
 *
 * @param ruleAssets - The asset rules to validate.
 * @param asset - The asset to validate against the rule assets
 *
 * @returns A boolean value indicating if the asset is valid.
 */
export function isValidAssetRule(
  ruleAssets: TransferAssets,
  asset: Asset,
): boolean {
  if (ruleAssets !== REGISTRATION_STRATEGY_ALL) {
    if (!Array.isArray(ruleAssets)) {
      return validateAssetLimitRule(ruleAssets, asset);
    }

    if (Array.isArray(ruleAssets)) {
      return ruleAssets.some((rule) => validateAssetLimitRule(rule, asset));
    }
  }

  return true;
}

/**
 * Validates the asset limit for the provided rules
 *
 * @param assetLimit - The asset limit to validate.
 * @param asset - The asset to validate against the rule assets
 *
 * @returns A boolean value indicating if the asset is valid.
 */
function validateAssetLimitRule(assetLimit: AssetLimit, asset: Asset): boolean {
  if ("id" in assetLimit && assetLimit.id !== undefined) {
    if (Buffer.compare(assetLimit.id, asset.id) !== 0) return false;
  }

  if ("name" in assetLimit && assetLimit.name !== undefined) {
    if (assetLimit.name.toUpperCase() !== asset.name.toUpperCase())
      return false;
  }

  if (
    "issuingBlockchainRid" in assetLimit &&
    assetLimit.issuingBlockchainRid !== undefined
  ) {
    if (
      Buffer.compare(assetLimit.issuingBlockchainRid, asset.blockchainRid) !== 0
    )
      return false;
  }

  return true;
}
