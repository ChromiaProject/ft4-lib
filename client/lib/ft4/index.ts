import { logger } from "postchain-client";

export * from "./accounts";
export * from "./authentication";
export * from "./registration";
export * from "./admin";
export * from "./asset";
export * from "./ft-session";
export * from "./utils";
export * from "./events";
export * from "./crosschain";
export * from "./transaction-builder";

export const ft = Object.freeze({
  setLogLevel: logger.setLogLevel,
});

ft.setLogLevel(logger.LogLevel.Disabled);
