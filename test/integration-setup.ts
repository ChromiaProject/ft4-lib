import { GenericContainer, Network, Wait } from "testcontainers";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { cwd } from "process";
import { writeFile, unlink, open, mkdir } from "node:fs/promises";

export default async function () {
  console.log("Starting node...");

  // recursive -> don't reject if it exists
  await mkdir("logs", { recursive: true });

  const filename = "logs/integration.log";
  await unlink(filename).catch((err) => {
    if (err.code !== "ENOENT") {
      console.error(err);
    }
  });
  const file = await open(filename, "a");

  // Start a new network for containers
  const network = await new Network().start();

  // Start a PostgreSQL container
  const postgres = await new PostgreSqlContainer("postgres:14.9-alpine3.18")
    .withNetwork(network)
    .withExposedPorts(5432)
    .withDatabase("postchain")
    .withPassword("postchain")
    .withUsername("postchain")
    .withNetworkAliases("postgres")
    .start();

  const isMacOS = process.platform === "darwin";
  const isARM = process.arch === "arm64";

  const JAVA_TOOL_OPTIONS =
    isMacOS && isARM ? "-Xmx16g -XX:UseSVE=0" : "-Xmx16g";

  // Start a Chromia node container
  const container = await new GenericContainer(
    "registry.gitlab.com/chromaway/core-tools/chromia-cli/chr:0.20.12",
  )
    .withNetwork(network)
    .withCopyDirectoriesToContainer([
      { source: `${cwd()}/rell`, target: "/usr/app/rell" },
    ])
    .withCopyDirectoriesToContainer([
      { source: `${cwd()}/configs`, target: "/usr/app/configs" },
    ])
    .withExposedPorts(7740)
    .withEnvironment({
      CHR_DB_URL: "jdbc:postgresql://postgres/postchain",
      JAVA_TOOL_OPTIONS,
    })
    .withCommand([
      "chr",
      "node",
      "start",
      "-s",
      "configs/jest-test.yml",
      "-np",
      "rell/config/jest-test-gitlab/node-config.properties",
      "--wipe",
    ])
    .withWaitStrategy(Wait.forLogMessage("Node is initialized"))
    .withStartupTimeout(60000)
    .withLogConsumer((stream) => {
      stream.on("data", (data) => {
        file.writeFile(data);
        if (data.startsWith("ERROR") || data.startsWith("WARN"))
          console.warn(data);
      });
      stream.on("err", (data) => file.writeFile(data));
      stream.on("end", file.close);
    })
    .start();

  // const url = "http://localhost:" + container.getMappedPort(7740);  //bitbucket
  const url = `http://${container.getHost()}:${container.getMappedPort(7740)}`; //gitlab

  await writeFile("node-url.txt", url, { encoding: "utf8" });
  console.log(`...started node on ${url}`);

  globalThis.__POSTGRES__ = postgres;
  globalThis.__POSTCHAIN__ = container;
  globalThis.__NETWORK__ = network;
}
