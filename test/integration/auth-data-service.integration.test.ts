import { AuthDataService } from "@ft4/authentication";
import { createAuthDataService, createConnection } from "@ft4/ft-session";
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
});
