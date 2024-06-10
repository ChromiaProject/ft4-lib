import {
  authDescriptorFromGtv,
  authDescriptorRegistrationToGtv,
  mapAuthDescriptorsFromGtv,
} from "./gtv";
import {
  ComplexRule,
  RawRules,
  RawSimpleRule,
  SimpleRule,
  rulesFromGtv,
} from "./rules";
import {
  AnyAuthDescriptor,
  AnyAuthDescriptorRegistration,
  RawAnyAuthDescriptor,
  RawAnyAuthDescriptorRegistration,
} from "./types";

export * from "./rules";
export * from "./validator";
export * from "./main";
export * from "./types";

export type AuthDescriptorGtvModule = {
  /**
   * Parses a simple or complex rule from its gtv representation to its typescript representation
   * @param gtvRules - the rules to parse as gtv
   * @param mapRule - a function that knows how to convert a raw simple rule to a simple rule
   */
  rulesFromGtv: <T extends string>(
    gtvRules: RawRules,
    mapRule: (rule: RawSimpleRule) => SimpleRule<T>,
  ) => ComplexRule<T> | SimpleRule<T>;

  /**
   * Serializes an auth descriptor registration instance into its gtv representation
   * @param registration - the representation to serialize
   */
  authDescriptorRegistrationToGtv: (
    registration: AnyAuthDescriptorRegistration,
  ) => RawAnyAuthDescriptorRegistration;

  /**
   * Parses an auth descriptor from its gtv representation to its typescript representation
   * @param res - the auth descriptor to parse
   */
  authDescriptorFromGtv: (res: RawAnyAuthDescriptor) => AnyAuthDescriptor;

  /**
   * Converts an auth descriptor from its gtv representation to its typescript representation
   * @param response - the auth descriptor to convert
   */
  mapAuthDescriptorsFromGtv: (
    response: RawAnyAuthDescriptor[],
  ) => AnyAuthDescriptor[];
};

export const gtv: AuthDescriptorGtvModule = Object.freeze({
  rulesFromGtv,
  authDescriptorRegistrationToGtv,
  authDescriptorFromGtv,
  mapAuthDescriptorsFromGtv,
});
