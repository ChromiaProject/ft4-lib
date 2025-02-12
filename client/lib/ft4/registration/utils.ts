import { BufferId } from "@ft4/utils";
import { ensureString } from "@ft4/authentication/login/stores/browser-login-keystore";
import { Asset } from "@ft4/asset";
import { Connection } from "@ft4/ft-session";
import {
  TransferParticipants,
  TransferSenderBlockchains,
  TransferStrategyRuleAmount,
} from "@ft4/registration/types";

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
 * Finds the valid strategy rules and returns the one with the lowest amount or 0 if no valid rules are found.
 *
 * @param rules - The rules to find the valid rules from.
 * @param senderBlockchainRid - The sender blockchain rid.
 * @param senderAndRecipientAccountId - The sender and recipient account id.
 * @param senderConnection - The senders connection to the blockchain.
 * @param asset - The asset to be checked for balance of the sender
 *
 * @returns The lowest amount or 0 if no valid rules are found.
 */
export async function findValidStrategyRulesAndGetLowestAmountOrZero(
  rules: TransferStrategyRuleAmount[] | undefined,
  senderBlockchainRid: BufferId,
  senderAndRecipientAccountId: BufferId,
  senderConnection: Connection,
  asset: Asset,
): Promise<bigint | undefined> {
  if (!rules || rules.length === 0) {
    return undefined;
  }

  const accountInCurrentchain = await senderConnection.getAccountById(
    senderAndRecipientAccountId,
  );

  const senderBalance = await accountInCurrentchain?.getBalanceByAssetId(
    asset.id,
  );

  const senderBalanceAmount = senderBalance?.amount?.value ?? BigInt(0);

  const validRules = getValidRules(
    rules,
    senderBlockchainRid,
    senderAndRecipientAccountId,
    senderBalanceAmount,
  );

  if (validRules.length === 0) {
    return BigInt(0);
  }

  const ruleWithSmallestAmount = validRules.reduce((prev, current) =>
    current.minAmount < prev.minAmount ? current : prev,
  );

  return ruleWithSmallestAmount.minAmount;
}

/**
 * Validates the received rules based on the sender blockchain, sender and recipient account id
 * while it ensures if the sender balance is enough to cover the min amount of the rule.
 *
 * @param rules - The rules to get the valid rules from.
 * @param senderBlockchainRid - The sender blockchain rid.
 * @param senderAndRecipientAccountId - The sender and recipient account id.
 * @param senderBalanceAmount - The sender balance amount.
 *
 * @returns The valid rules, which can be none, one or multiple.
 */
export function getValidRules(
  rules: TransferStrategyRuleAmount[],
  senderBlockchainRid: BufferId,
  senderAndRecipientAccountId: BufferId,
  senderBalanceAmount: bigint,
): TransferStrategyRuleAmount[] {
  return rules.filter((rule) => {
    const isValiderBlockchain = isValidSenderBlockchainRule(
      rule.senderBlockchains,
      senderBlockchainRid,
    );
    const isValidSender = isValidParticipantRule(
      rule.senders,
      senderAndRecipientAccountId,
    );
    const isValidRecipient = isValidParticipantRule(
      rule.recipients,
      senderAndRecipientAccountId,
    );
    const isSenderBalanceEnough = senderBalanceAmount >= rule.minAmount;

    return (
      isValiderBlockchain &&
      isValidSender &&
      isValidRecipient &&
      isSenderBalanceEnough
    );
  });
}

/**
 * Validates the participant rules for the provided rules
 *
 * @param ruleParticipant - The participant rules to validate.
 * @param accountId - The account ID to validate against against the rule participants
 *
 * @returns A boolean value indicating if the participant rule is valid.
 */
export function isValidParticipantRule(
  ruleParticipant: TransferParticipants,
  accountId: BufferId,
): boolean {
  if (ruleParticipant !== "all" && ruleParticipant !== "current") {
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

  return true;
}

/**
 * Validates the sender blockchains for the provided rules
 *
 * @param senderBlockchains - The sender blockchain rules to validate.
 * @param senderBlockchainRid - The sender blockchain rid to compare againsts the rules
 *
 * @returns A boolean value indicating if the sender blockchain rule is valid.
 */
export function isValidSenderBlockchainRule(
  senderBlockchains: TransferSenderBlockchains,
  senderBlockchainRid: BufferId,
): boolean {
  if (senderBlockchains !== "all") {
    if (
      Buffer.isBuffer(senderBlockchains) ||
      typeof senderBlockchains === "string"
    ) {
      if (
        ensureString(senderBlockchains) !== ensureString(senderBlockchainRid)
      ) {
        return false;
      }
    }

    if (Array.isArray(senderBlockchains)) {
      if (!senderBlockchains.includes(ensureBuffer(senderBlockchainRid))) {
        return false;
      }
    }
  }

  return true;
}
