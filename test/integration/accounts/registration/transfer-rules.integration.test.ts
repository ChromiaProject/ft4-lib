import { addNewAssetIfNeeded, useChromiaNode } from "@ft4-test/util";
import { Asset } from "@ft4/asset";
import { Connection, createConnection } from "@ft4/ft-session";
import {
  getTransferStrategyRules,
  getTransferStrategyRulesGroupedByStrategy,
  TransferStrategyRule,
  TransferStrategyRuleAmount,
} from "@ft4/registration";
import { formatter } from "postchain-client";

describe("Transfer strategy rules", () => {
  const getClient = useChromiaNode();

  let connection: Connection;
  let timeoutAsset: Asset;
  let transferStrategyAsset: Asset;
  let transferFeeStrategyAsset: Asset;
  let trasnferSubscriptionStrategyAsset: Asset;

  beforeAll(async () => {
    const client = getClient();
    connection = createConnection(client);

    timeoutAsset = await addNewAssetIfNeeded(
      connection.client,
      "timeout_asset",
      "TIMEOUT_ASSET",
      5,
    );

    transferStrategyAsset = await addNewAssetIfNeeded(
      connection.client,
      "transfer_strategy_asset",
      "TRANSFER_STRATEGY_ASSET",
      5,
    );

    transferFeeStrategyAsset = await addNewAssetIfNeeded(
      connection.client,
      "transfer_fee_strategy_asset",
      "TRANSFER_FEE_STRATEGY_ASSET",
      5,
    );

    trasnferSubscriptionStrategyAsset = await addNewAssetIfNeeded(
      connection.client,
      "transfer_subscription_strategy_asset",
      "TRANSFER_SUBSCRIPTION_STRATEGY_ASSET",
      5,
    );
  });

  it("returns transfer strategy rules", async () => {
    const rules = await getTransferStrategyRules(connection);

    // Expected rules defined based on transfer strategy rules in configs/jest-test.yml
    const expectedRules: TransferStrategyRule[] = [
      {
        senderBlockchains: [
          formatter.ensureBuffer(connection.client.config.blockchainRid),
        ],
        senders: "all",
        recipients: "all",
        timeoutDays: 1,
        assets: [
          {
            id: transferStrategyAsset.id,
            name: "transfer_strategy_asset",
            issuingBlockchainRid: formatter.ensureBuffer(
              connection.client.config.blockchainRid,
            ),
            minAmount: 5n,
          },
          {
            id: transferFeeStrategyAsset.id,
            name: "transfer_fee_strategy_asset",
            issuingBlockchainRid: formatter.ensureBuffer(
              connection.client.config.blockchainRid,
            ),
            minAmount: 5n,
          },
          {
            id: trasnferSubscriptionStrategyAsset.id,
            name: "transfer_subscription_strategy_asset",
            issuingBlockchainRid: formatter.ensureBuffer(
              connection.client.config.blockchainRid,
            ),
            minAmount: 5n,
          },
        ],
        strategies: ["open", "fee", "subscription"],
      },
      {
        senderBlockchains: [
          formatter.ensureBuffer(connection.client.config.blockchainRid),
        ],
        senders: "all",
        recipients: "all",
        timeoutDays: 0,
        assets: [
          {
            id: timeoutAsset.id,
            name: "timeout_asset",
            issuingBlockchainRid: formatter.ensureBuffer(
              connection.client.config.blockchainRid,
            ),
            minAmount: 5n,
          },
        ],
        strategies: ["open", "fee", "subscription"],
      },
    ];

    expect(JSON.stringify(rules)).toStrictEqual(JSON.stringify(expectedRules));
  });

  it("returns transfer strategy rules grouped by strategy", async () => {
    const rules = await getTransferStrategyRulesGroupedByStrategy(connection);

    const rulesMap = new Map<string, TransferStrategyRuleAmount[]>([
      [
        formatter.toString(transferStrategyAsset.id),
        [
          {
            senderBlockchains: [
              formatter.ensureBuffer(connection.client.config.blockchainRid),
            ],
            senders: "all",
            recipients: "all",
            timeoutDays: 1,
            minAmount: 5n,
            assets: "all",
          },
        ],
      ],
      [
        formatter.toString(transferFeeStrategyAsset.id),
        [
          {
            senderBlockchains: [
              formatter.ensureBuffer(connection.client.config.blockchainRid),
            ],
            senders: "all",
            recipients: "all",
            timeoutDays: 1,
            minAmount: 5n,
            assets: "all",
          },
        ],
      ],
      [
        formatter.toString(trasnferSubscriptionStrategyAsset.id),
        [
          {
            senderBlockchains: [
              formatter.ensureBuffer(connection.client.config.blockchainRid),
            ],
            senders: "all",
            recipients: "all",
            timeoutDays: 1,
            minAmount: 5n,
            assets: "all",
          },
        ],
      ],
      [
        formatter.toString(timeoutAsset.id),
        [
          {
            senderBlockchains: [
              formatter.ensureBuffer(connection.client.config.blockchainRid),
            ],
            senders: "all",
            recipients: "all",
            timeoutDays: 0,
            minAmount: 5n,
            assets: "all",
          },
        ],
      ],
    ]);

    const expectedResult = new Map<
      string,
      Map<string, TransferStrategyRuleAmount[]>
    >([
      ["open", rulesMap],
      ["fee", rulesMap],
      ["subscription", rulesMap],
    ]);

    expect(JSON.stringify(rules)).toStrictEqual(JSON.stringify(expectedResult));
  });
});
