import {
  authDescriptorFromGtv,
  authDescriptorRegistrationToGtv,
  mapAuthDescriptorsFromGtv,
} from "./gtv";
import { rulesFromGtv } from "./rules";

export * from "./rules"
export * from "./validator"
export * from "./main"
export * from "./types"

export const gtv = Object.freeze({
  rulesFromGtv,
  authDescriptorRegistrationToGtv,
  authDescriptorFromGtv,
  mapAuthDescriptorsFromGtv,
});
