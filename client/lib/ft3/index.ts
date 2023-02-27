import { version } from "../../../package.json";
import { createQuerySession, createUserSession } from "./ft-session";
import { setLogLevel } from "postchain-client/built/src/logger";

export const ft = Object.freeze({
  getClientVersion: () => version,
  setLogLevel,
  createUserSession,
  createQuerySession,
});

setLogLevel(0);
