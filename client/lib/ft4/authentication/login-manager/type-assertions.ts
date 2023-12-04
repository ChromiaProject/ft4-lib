import {
  LoginConfigNullRule,
  LoginConfigRule,
  LoginConfigSimpleRule,
} from "./types";
import { AuthDescriptorRule } from "/ft4/accounts";

export function isLoginConfigRule(
  rule: LoginConfigRule | AuthDescriptorRule,
): rule is LoginConfigRule {
  return (
    rule === null ||
    (rule[0] !== "and" && typeof rule[2] === "string") ||
    (rule[0] === "and" && typeof rule[1][2] === "string")
  );
}
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
