import {
  LoginConfigNullRule,
  LoginConfigRule,
  LoginConfigSimpleRule,
} from "./types";

export function isLoginConfigSimpleRule(
  rule: LoginConfigRule,
): rule is LoginConfigSimpleRule {
  return rule !== null && rule[0] !== "and";
}
export function isLoginConfigNullRule(
  rule: LoginConfigRule,
): rule is LoginConfigNullRule {
  return rule === null;
}
