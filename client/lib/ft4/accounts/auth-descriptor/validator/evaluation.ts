import {
  AnyAuthDescriptor,
  AuthDescriptorRuleVariable,
  AuthDescriptorSimpleRule,
  RuleOperator,
} from "@ft4/accounts";
import {
  AuthDescriptorValidationService,
  AuthDescriptorValidator,
} from "./types";

/**
 * Creates a general `AuthDescriptorValidator` instance from a more specialized variant
 * @param service - the specialized service to use
 * @returns an `AuthDescriptorValidator` instance
 */
export function createBaseAuthDescriptorValidator(
  service: AuthDescriptorValidationService,
): AuthDescriptorValidator {
  return Object.freeze({
    isActive: (authDescriptor: AnyAuthDescriptor) =>
      isActive(authDescriptor, service),
    hasExpired: (authDescriptor: AnyAuthDescriptor) =>
      hasExpired(authDescriptor, service),
  });
}

/**
 * Returns whether the given auth descriptor's rules are active, that is whether they
 * have already all been triggered at least once.
 * An inactive auth descriptor will be active in the future, while an active one might
 * be active or have already expired. Use `hasExpired` to check for this case.
 * @param authDescriptor - the auth descriptor to check
 * @param service - an object used to fetch dynamic parameters from blockchain
 * This allows caching.
 */
async function isActive(
  authDescriptor: AnyAuthDescriptor,
  service: AuthDescriptorValidationService,
): Promise<boolean> {
  if (authDescriptor.rules === null) return true;

  const isRuleActive = async (rule: AuthDescriptorSimpleRule) => {
    if (
      rule.operator === RuleOperator.LessOrEqual ||
      rule.operator === RuleOperator.LessThan ||
      rule.variable === AuthDescriptorRuleVariable.OpCount
    ) {
      // these rules are always valid
      return true;
    }

    let variable: number;
    if (rule.variable === AuthDescriptorRuleVariable.BlockHeight) {
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
 * @param authDescriptor - the auth descriptor to check
 * @param service - an object used to fetch dynamic parameters from blockchain
 * This allows caching.
 */
async function hasExpired(
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
    if (rule.variable === AuthDescriptorRuleVariable.BlockHeight) {
      variable = await service.getBlockHeight();
    } else if (rule.variable === AuthDescriptorRuleVariable.BlockTime) {
      variable = Date.now();
    } else {
      const counter = await service.getAuthDescriptorCounter(
        authDescriptor.accountId,
        authDescriptor.id,
      );

      // auth descriptor expired and was eliminated on rell side
      if (counter === null) return true;
      variable = counter + 1;
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
