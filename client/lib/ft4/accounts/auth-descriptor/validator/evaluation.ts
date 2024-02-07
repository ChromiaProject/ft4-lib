import { BufferId } from "@ft4/utils/types";
import {
  AuthDescriptorSimpleRule,
  RuleOperator,
  RuleVariable,
  AnyAuthDescriptor,
} from "../types";

/**
 * Returns whether the given auth descriptor's rules are active, that is whether they
 * have already all been triggered at least once.
 * An inactive auth descriptor will be active in the future, while an active one might
 * be active or have already expired. Use `hasExpired` to check for this case.
 * @param authDescriptor the auth descriptor to check
 * @param getBlockHeight an async function that returns the current block height.
 * This allows caching.
 */
export async function isActive(
  authDescriptor: AnyAuthDescriptor,
  service: AuthDescriptorValidationService,
): Promise<boolean> {
  if (authDescriptor.rules === null) return true;

  const isRuleActive = async (rule: AuthDescriptorSimpleRule) => {
    if (
      rule.operator === RuleOperator.LessOrEqual ||
      rule.operator === RuleOperator.LessThan ||
      rule.variable === RuleVariable.OpCount
    ) {
      // these rules are always valid
      return true;
    }

    let variable: number;
    if (rule.variable === RuleVariable.BlockHeight) {
      variable = await service.getBlockHeight();
    } else {
      variable = Date.now();
    }

    if (
      rule.operator === RuleOperator.Equals ||
      rule.operator === RuleOperator.GreaterOrEqual
    ) {
      return variable >= rule.value;
    } else {
      return variable > rule.value;
    }
  };

  if (authDescriptor.rules.operator === "and") {
    return (
      await Promise.all(authDescriptor.rules.rules.map(isRuleActive))
    ).every(Boolean);
  } else {
    return await isRuleActive(authDescriptor.rules);
  }
}

/**
 * Returns whether the given auth descriptor's rules have expired, that is whether it will
 * no longer ever be usable. Inactive descriptors never return true.
 * @param authDescriptor the auth descriptor to check
 * @param getBlockHeight an async function that returns the current block height.
 * This allows caching.
 * @param getNonce an async function that returns the current nonce for the given descriptor.
 * This allows caching.
 */
export async function hasExpired(
  authDescriptor: AnyAuthDescriptor,
  service: AuthDescriptorValidationService,
): Promise<boolean> {
  if (authDescriptor.rules === null) return false;

  const hasRuleExpired = async (rule: AuthDescriptorSimpleRule) => {
    if (
      rule.operator === RuleOperator.GreaterOrEqual ||
      rule.operator === RuleOperator.GreaterThan
    ) {
      // these rules never expire
      return false;
    }

    let variable: number;
    if (rule.variable === RuleVariable.BlockHeight) {
      variable = await service.getBlockHeight();
    } else if (rule.variable === RuleVariable.BlockTime) {
      variable = Date.now();
    } else {
      const nonce = await service.getNonce(
        authDescriptor.accountId,
        authDescriptor.id,
      );
      // auth descriptor expired and was eliminated on rell side
      if (nonce === null) return true;
      variable = nonce;
    }

    if (
      rule.operator === RuleOperator.Equals ||
      rule.operator === RuleOperator.LessOrEqual
    ) {
      return variable > rule.value;
    } else {
      return variable >= rule.value;
    }
  };

  if (authDescriptor.rules.operator === "and") {
    return (
      await Promise.all(authDescriptor.rules.rules.map(hasRuleExpired))
    ).some(Boolean);
  } else {
    return await hasRuleExpired(authDescriptor.rules);
  }
}

export interface AuthDescriptorValidationService {
  getBlockHeight: () => Promise<number>;
  getNonce: (
    accountId: BufferId,
    authDescriptorId: BufferId,
  ) => Promise<number | null>;
}
