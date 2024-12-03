import {
  adminUser,
  registerCrosschainAsset,
  useChromiaNode,
} from "@ft4-test/util";
import { getAssetDetailsForCrosschainRegistration } from "@ft4/asset";
import { Connection, createConnection } from "@ft4/ft-session";
import { IClient, formatter } from "postchain-client";

describe("Crosschain asset", () => {
  let client: IClient;
  let connection: Connection;
  const getClient = useChromiaNode();

  beforeAll(async () => {
    client = getClient();
    connection = createConnection(client);
  });

  it("returns all properties needed to register a crosschain asset", async () => {
    const id = formatter.ensureBuffer("aa".repeat(32));
    const name = "Test asset";
    const symbol = "TST";
    const decimals = 18;
    const blockchainRid = formatter.ensureBuffer("aa".repeat(32));
    const iconUrl = "https://icon.url/1";
    const type = "FT4";
    const uniquenessResolver = formatter.ensureBuffer("098756");

    await registerCrosschainAsset(
      connection,
      adminUser().signatureProvider,
      {
        id,
        name,
        symbol,
        decimals,
        blockchainRid,
        iconUrl,
        type,
        uniquenessResolver,
      },
      formatter.ensureBuffer("bb".repeat(32)),
    );

    const asset = await getAssetDetailsForCrosschainRegistration(
      connection,
      id,
    );

    expect(asset).toEqual({
      id,
      name,
      symbol,
      decimals,
      blockchainRid,
      iconUrl,
      type,
      uniquenessResolver,
    });
  });
});
