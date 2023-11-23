import { newSignatureProvider } from "postchain-client";
import { authDescriptor as ad, FlagsType } from "/ft4/accounts/auth-descriptor";
import { createAmount } from "/ft4/asset/amount";
import { Asset } from "/ft4/asset/types";
import { createInMemoryFtKeyStore } from "/ft4/authentication/ft/key-stores/in-memory";
import { createConnection, createKeyStoreInteractor } from "/ft4/ft-session";
import AccountBuilder from "./util/account-builder";
import adminUser from "./util/admin_user";
import { getNewAsset, createChromiaClient } from "./util/blockchain-util";
import TestUser from "./util/test-user";
import { registerAccount } from "/ft4/admin/admin-op-functions";
import { Connection } from "/ft4/types";
import { cwd } from "process";
import {
  GenericContainer,
  Network,
  StartedTestContainer,
  Wait,
} from "testcontainers";
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { IClient } from "postchain-client";

let postgres: StartedPostgreSqlContainer;
let container: StartedTestContainer;

let asset: Asset;
let connection: Connection;
let client: IClient;
const admin = adminUser();

describe("Transfer", () => {
  beforeAll(async () => {
    // Start a new network for containers
    const network = await new Network().start();

    // Start a PostgreSQL container
    postgres = await new PostgreSqlContainer("postgres:14.9-alpine3.18")
      .withNetwork(network)
      .withExposedPorts(5432)
      .withDatabase("postchain")
      .withPassword("postchain")
      .withUsername("postchain")
      .withNetworkAliases("postgres")
      .start();

    // Start a Chromia node container
    container = await new GenericContainer(
      "registry.gitlab.com/chromaway/core-tools/chromia-cli/chr:0.13.2",
    )
      .withNetwork(network)
      .withCopyDirectoriesToContainer([{ source: cwd(), target: "/usr/app" }])
      .withExposedPorts(7740)
      .withEnvironment({
        CHR_DB_URL: "jdbc:postgresql://postgres/postchain",
      })
      .withCommand([
        "chr",
        "node",
        "start",
        "-s",
        "configs/jest-test.yml",
        "-np",
        "rell/config/jest-test/node-config.properties",
        "--wipe",
      ])
      .withLogConsumer((stream) => {
        stream.on("data", (line) => console.log(line));
        stream.on("err", (line) => console.error(line));
        stream.on("end", () => console.log("Stream closed"));
      })
      .withWaitStrategy(Wait.forLogMessage("Blockchain has been started"))
      .withStartupTimeout(60000)
      .start();

    client = await createChromiaClient(
      "http://localhost:" + container.getMappedPort(7740),
    );
    connection = createConnection(client);
    asset = await getNewAsset(connection.client, undefined, undefined, 5);
  });

  // Stop containers after all tests are complete
  afterAll(async () => {
    await container.stop();
    await postgres.stop();
  });

  it("should succeed when balance is higher than amount to transfer", async () => {
    const account1 = await AccountBuilder.account(connection)
      .withBalance(asset, 200)
      .withPoints(1)
      .build();

    const account2 = await AccountBuilder.account(connection).build();

    await account1.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals),
    );

    const assetBalance1 = await account1.getBalanceByAssetId(asset.id);
    const assetBalance2 = await account2.getBalanceByAssetId(asset.id);

    expect(assetBalance1.amount.eq(createAmount(190, asset.decimals))).toBe(
      true,
    );
    expect(assetBalance2.amount.eq(createAmount(10, asset.decimals))).toBe(
      true,
    );
  });

  it("fails when balance is lower than amount to transfer", async () => {
    const account1 = await AccountBuilder.account(connection)
      .withBalance(asset, 5)
      .withPoints(1)
      .build();

    const account2 = await AccountBuilder.account(connection).build();

    const promise = account1.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals),
    );

    await expect(promise).rejects.toBeInstanceOf(Error);
  });

  it("should fail if auth descriptor doesn't have transfer rights", async () => {
    const account1 = await AccountBuilder.account(connection)
      .withAuthFlags(FlagsType.Account)
      .withBalance(asset, 200)
      .withPoints(1)
      .build();

    const account2 = await AccountBuilder.account(connection).build();

    const promise = account1.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals),
    );
    await expect(promise).rejects.toBeInstanceOf(Error);
  });

  it("should succeed if transferring tokens to a multisig account", async () => {
    const user2 = TestUser();
    const user3 = TestUser();

    const account1 = await AccountBuilder.account(connection)
      .withBalance(asset, 200)
      .withPoints(1)
      .build();

    const authDescriptor = ad.create.multiSig.withArgs(
      [FlagsType.Account, FlagsType.Transfer],
      2,
      [user2.signatureProvider.pubKey, user3.signatureProvider.pubKey],
    ).andNoRules;

    await registerAccount(
      connection.client,
      admin.signatureProvider,
      authDescriptor,
    );

    const account2 = await createConnection(connection.client).getAccountById(
      authDescriptor.id,
    );

    await account1.transfer(
      account2.id,
      asset.id,
      createAmount(10, asset.decimals),
    );

    const assetBalance1 = await account1.getBalanceByAssetId(asset.id);
    const assetBalance2 = await account2.getBalanceByAssetId(asset.id);

    expect(assetBalance1.amount.eq(createAmount(190, asset.decimals))).toBe(
      true,
    );
    expect(assetBalance2.amount.eq(createAmount(10, asset.decimals))).toBe(
      true,
    );
  });

  it("should succeed burning tokens", async () => {
    const keyPair = newSignatureProvider();

    const account = await AccountBuilder.account(connection)
      .withParticipant(keyPair)
      .withBalance(asset, 200)
      .withPoints(1)
      .build();

    const session = await createKeyStoreInteractor(
      client,
      createInMemoryFtKeyStore(keyPair),
    ).getSession(account.id);
    await session.account.burn(asset.id, createAmount(10, asset.decimals));
    const assetBalance = await session.account.getBalanceByAssetId(asset.id);

    expect(
      assetBalance.amount.eq(createAmount(190, asset.decimals)),
    ).toBeTruthy();
  });
});
