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
import { createChromiaClient } from "/util/blockchain-util";
import { cwd } from "process";

export function useChromiaNode() {
  let postgres: StartedPostgreSqlContainer;
  let container: StartedTestContainer;
  let client: IClient;

  beforeAll(async () => {
    console.log("Starting node");

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
      .withWaitStrategy(Wait.forLogMessage("Blockchain has been started"))
      .withStartupTimeout(60000)
      .start();

    client = await createChromiaClient(
      "http://localhost:" + container.getMappedPort(7740),
    );

    console.log("Started node");
  });

  // Stop containers after all tests are complete
  afterAll(async () => {
    console.log("Stopping node");
    await container.stop();
    await postgres.stop();
    console.log("Stopped node");
  });

  return () => client;
}
