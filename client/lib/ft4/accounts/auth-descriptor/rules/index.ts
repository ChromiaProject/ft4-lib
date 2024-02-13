import {
  AuthDescriptorComplexRule,
  AuthDescriptorRules,
  AuthDescriptorSimpleRule,
  RawRules,
  RawSimpleRule,
} from "./types";

export * from "./types";
export * from "./variables";
export * from "./operators";

export function isSimpleRule(
  rule: AuthDescriptorRules,
): rule is AuthDescriptorSimpleRule {
  return (rule as AuthDescriptorComplexRule).rules === undefined;
}

export function isGtvSimpleRule(rule: RawRules): rule is RawSimpleRule {
  return rule[0] !== "and";
}
