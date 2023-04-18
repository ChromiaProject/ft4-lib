import { logger } from "postchain-client";
import { version } from "../../../package.json";
import { createQuerySession, createUserSession } from "./ft-session";
import { authDescriptor } from "./account/auth-descriptor";

export const ft = Object.freeze({
  getClientVersion: () => version,
  setLogLevel: logger.setLogLevel,
  createUserSession,
  createQuerySession,
  authDescriptor,
});

ft.setLogLevel(0);
