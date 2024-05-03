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
  rulesFromGtv: <T extends string>(
    gtvRules: RawRules,
    mapRule: (rule: RawSimpleRule) => SimpleRule<T>,
  ) => ComplexRule<T> | SimpleRule<T>;
  authDescriptorRegistrationToGtv: (
    registration: AnyAuthDescriptorRegistration,
  ) => RawAnyAuthDescriptorRegistration;
  authDescriptorFromGtv: (res: RawAnyAuthDescriptor) => AnyAuthDescriptor;
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
