import {
  LoginConfigSimpleRule,
  RawRules,
  Rules,
  AnySimpleRule,
  RawAnySimpleRule,
  RawLoginConfigSimpleRule,
} from "./types";

export function isLoginConfigSimpleRule(
  rule: AnySimpleRule | RawAnySimpleRule,
): rule is LoginConfigSimpleRule | RawLoginConfigSimpleRule {
  return isRawRule(rule)
    ? typeof rule[2] === "string"
    : typeof rule.value === "string";
}

export function isSimpleRule(
  rule: Rules | RawRules,
): rule is AnySimpleRule | RawAnySimpleRule {
  return (
    rule !== null &&
    (isRawRule(rule)
      ? rule[0] !== "and"
      : Object.prototype.hasOwnProperty.call(rule, "variable"))
  );
}

export function isNullRule(rule: Rules | RawRules): rule is null {
  return rule === null;
}

export function isRawRule(
  rule: Rules | RawRules,
): rule is Exclude<RawRules, null> {
  return Array.isArray(rule);
}
