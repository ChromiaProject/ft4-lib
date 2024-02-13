import { AuthDataService } from "@ft4/authentication";
import {
  and,
  relativeBlockHeight,
  opCount,
} from "@ft4/authentication/login-manager/rules";
import { createAuthDataService, createConnection } from "@ft4/ft-session";
import { lessOrEqual, lessThan, ttlLoginRule } from "@ft4/index";
import { useChromiaNode } from "@ft4/util/chromia-node";

describe("Test auth data service", () => {
  let _authDataService: AuthDataService;
  const getClient = useChromiaNode();

  beforeAll(async () => {
    const client = getClient();
    _authDataService = createAuthDataService(createConnection(client));
  });

  it("gets operations scope auth handler when operation scope auth handler defined", async () => {
    const authHandler = await _authDataService.getAuthHandlerForOperation(
      "test_empty_auth_message",
    );
    expect(authHandler!.name).toEqual("test_empty_auth_message");
  });

  it("gets login config rules", async () => {
    const config = await _authDataService.getLoginConfig(
      "custom_config_with_ttl",
    );

    expect(config).toEqual({
      flags: ["Z"],
      rules: ttlLoginRule(10),
    });
  });

  it("gets config with simple rule", async () => {
    const config = await _authDataService.getLoginConfig(
      "custom_config_with_simple_rule",
    );
    expect(config).toEqual({
      flags: ["W"],
      rules: lessThan(relativeBlockHeight(5)),
    });
  });

  it("gets config with complex rules", async () => {
    const config = await _authDataService.getLoginConfig(
      "custom_config_with_complex_rule",
    );

    expect(config).toEqual({
      flags: ["A", "Z"],
      rules: and(lessThan(relativeBlockHeight(5)), lessOrEqual(opCount(7))),
    });
  });
});
