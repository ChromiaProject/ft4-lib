import { logger } from "postchain-client";

const ft = Object.freeze({
  setLogLevel: logger.setLogLevel,
});

ft.setLogLevel(logger.LogLevel.Disabled);

jest.setTimeout(9999999);
