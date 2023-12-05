import {
  LoginConfigNullRule,
  LoginConfigRule,
  LoginConfigSimpleRule,
} from "./types";
import {
  AuthDescriptorNullRule,
  AuthDescriptorRule,
  AuthDescriptorSimpleRule,
} from "/ft4/accounts";

export function isLoginConfigRule(
  rule: LoginConfigSimpleRule | AuthDescriptorSimpleRule,
): rule is LoginConfigSimpleRule {
  return typeof rule[2] === "string";
}

export function isSimpleRule(
  rule: LoginConfigRule | AuthDescriptorRule,
): rule is LoginConfigSimpleRule | AuthDescriptorSimpleRule {
  return rule !== null && rule[0] !== "and";
}

export function isNullRule(
  rule: LoginConfigRule | AuthDescriptorRule,
): rule is LoginConfigNullRule | AuthDescriptorNullRule {
  return rule === null;
}
