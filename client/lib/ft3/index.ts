import { logger } from "postchain-client";
import { version } from "../../../package.json";
import { createQuerySession, createUserSession } from "./ft-session";

export const ft = Object.freeze({
  getClientVersion: () => version,
  setLogLevel: logger.setLogLevel,
  createUserSession,
  createQuerySession,
});

ft.setLogLevel(0);
