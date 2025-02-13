import { Connection, createConnection } from "@ft4/ft-session";
import {
  getTransferStrategyRules,
  getTransferStrategyRulesGroupedByStrategy,
  TransferStrategyRule,
  TransferStrategyRuleAmount,
  TransferStrategyRuleRaw,
} from "@ft4/registration";
import { AllowedAssets } from "@ft4/registration/strategies/types";
import { createStubClient, encryption, formatter } from "postchain-client";

describe("Transfer strategy rules", () => {
  let connection: Omit<Connection, "query"> & { query: jest.Mock };

  const blockchain1 = encryption.randomBytes(32);
  const blockchain2 = encryption.randomBytes(32);
  const sender1 = encryption.randomBytes(32);
  const sender2 = encryption.randomBytes(32);
  const recipient1 = encryption.randomBytes(32);
  const recipient2 = encryption.randomBytes(32);
  const asset1 = encryption.randomBytes(32);
  const asset2 = encryption.randomBytes(32);

  beforeEach(async () => {
    connection = {
      ...createConnection(await createStubClient()),
      query: jest.fn(),
    };
  });

  const createAllowedAssets = (
    id: Buffer,
    minAmount: bigint,
  ): AllowedAssets => ({
    id,
    name: "TestAsset",
    issuing_blockchain_rid: Buffer.alloc(32),
    min_amount: minAmount,
  });

  it("correctly maps response when properties have 'all' values", async () => {
    const response: TransferStrategyRuleRaw[] = [
      {
        strategies: ["fee"],
        blockchains: {
          allow_all: true,
          allowed_values: [],
        },
        senders: {
          allow_all: true,
          allowed_values: [],
        },
        recipients: {
          allow_all: true,
          allowed_values: [],
        },
        require_same_address: false,
        assets: {
          allow_all: true,
          allowed_values: [],
        },
        timeout_days: 1,
      },
    ];

    connection.query.mockReturnValueOnce(response);

    const rules = await getTransferStrategyRules(connection);

    const expectedResponse: TransferStrategyRule[] = [
      {
        strategies: ["fee"],
        senderBlockchains: "all",
        senders: "all",
        recipients: "all",
        assets: "all",
        timeoutDays: 1,
      },
    ];

    expect(rules).toEqual(expectedResponse);
  });

  it("correctly maps response when properties have single value", async () => {
    const response: TransferStrategyRuleRaw[] = [
      {
        strategies: ["fee"],
        blockchains: {
          allow_all: false,
          allowed_values: [blockchain1],
        },
        senders: {
          allow_all: false,
          allowed_values: [sender1],
        },
        recipients: {
          allow_all: false,
          allowed_values: [recipient1],
        },
        require_same_address: false,
        assets: {
          allow_all: false,
          allowed_values: [createAllowedAssets(asset1, 10n)],
        },
        timeout_days: 1,
      },
    ];

    connection.query.mockReturnValueOnce(response);

    const rules = await getTransferStrategyRules(connection);

    const expectedResponse: TransferStrategyRule[] = [
      {
        strategies: ["fee"],
        senderBlockchains: [blockchain1],
        senders: [sender1],
        recipients: [recipient1],
        assets: [
          {
            id: asset1,
            name: "TestAsset",
            issuingBlockchainRid: Buffer.alloc(32),
            minAmount: 10n,
          },
        ],
        timeoutDays: 1,
      },
    ];

    expect(rules).toEqual(expectedResponse);
  });

  it("correctly maps response with same sender and recipient", async () => {
    const response: TransferStrategyRuleRaw[] = [
      {
        strategies: ["fee"],
        blockchains: {
          allow_all: false,
          allowed_values: [blockchain1],
        },
        senders: {
          allow_all: false,
          allowed_values: [],
        },
        recipients: {
          allow_all: false,
          allowed_values: [],
        },
        require_same_address: true,
        assets: {
          allow_all: false,
          allowed_values: [createAllowedAssets(asset1, 11n)],
        },
        timeout_days: 10,
      },
    ];

    connection.query.mockReturnValueOnce(response);

    const rules = await getTransferStrategyRules(connection);

    const expectedResponse: TransferStrategyRule[] = [
      {
        strategies: ["fee"],
        senderBlockchains: [blockchain1],
        senders: "current",
        recipients: "current",
        assets: [
          {
            id: asset1,
            name: "TestAsset",
            issuingBlockchainRid: Buffer.alloc(32),
            minAmount: 11n,
          },
        ],
        timeoutDays: 10,
      },
    ];

    expect(rules).toEqual(expectedResponse);
  });

  it("correctly maps response when attributes have multiple values", async () => {
    const response: TransferStrategyRuleRaw[] = [
      {
        strategies: ["fee"],
        blockchains: {
          allow_all: false,
          allowed_values: [blockchain1, blockchain2],
        },
        senders: {
          allow_all: false,
          allowed_values: [sender1, sender2],
        },
        recipients: {
          allow_all: false,
          allowed_values: [recipient1, recipient2],
        },
        require_same_address: false,
        assets: {
          allow_all: false,
          allowed_values: [
            createAllowedAssets(asset1, 100n),
            createAllowedAssets(asset2, 200n),
          ],
        },
        timeout_days: 1,
      },
    ];

    connection.query.mockReturnValueOnce(response);

    const rules = await getTransferStrategyRules(connection);

    const expectedResponse: TransferStrategyRule[] = [
      {
        strategies: ["fee"],
        senderBlockchains: [blockchain1, blockchain2],
        senders: [sender1, sender2],
        recipients: [recipient1, recipient2],
        assets: [
          {
            id: asset1,
            name: "TestAsset",
            issuingBlockchainRid: Buffer.alloc(32),
            minAmount: 100n,
          },
          {
            id: asset2,
            name: "TestAsset",
            issuingBlockchainRid: Buffer.alloc(32),
            minAmount: 200n,
          },
        ],
        timeoutDays: 1,
      },
    ];

    expect(rules).toEqual(expectedResponse);
  });

  it("correctly maps response when there is more than one rule", async () => {
    const response: TransferStrategyRuleRaw[] = [
      {
        strategies: ["fee"],
        blockchains: {
          allow_all: false,
          allowed_values: [blockchain1],
        },
        senders: {
          allow_all: false,
          allowed_values: [sender1],
        },
        recipients: {
          allow_all: false,
          allowed_values: [recipient1],
        },
        require_same_address: false,
        assets: {
          allow_all: false,
          allowed_values: [
            {
              id: asset1,
              min_amount: 15n,
              name: "TestAsset",
              issuing_blockchain_rid: Buffer.alloc(32),
            },
          ],
        },
        timeout_days: 1,
      },
      {
        strategies: ["fee"],
        blockchains: {
          allow_all: true,
          allowed_values: [],
        },
        senders: {
          allow_all: true,
          allowed_values: [],
        },
        recipients: {
          allow_all: true,
          allowed_values: [],
        },
        require_same_address: false,
        assets: {
          allow_all: false,
          allowed_values: [
            {
              id: asset2,
              min_amount: 20n,
              name: "TestAsset",
              issuing_blockchain_rid: Buffer.alloc(32),
            },
          ],
        },
        timeout_days: 1,
      },
    ];

    connection.query.mockReturnValueOnce(response);

    const rules = await getTransferStrategyRules(connection);

    const expectedResponse: TransferStrategyRule[] = [
      {
        strategies: ["fee"],
        senderBlockchains: [blockchain1],
        senders: [sender1],
        recipients: [recipient1],
        assets: [
          {
            id: asset1,
            name: "TestAsset",
            issuingBlockchainRid: Buffer.alloc(32),
            minAmount: 15n,
          },
        ],
        timeoutDays: 1,
      },
      {
        strategies: ["fee"],
        senderBlockchains: "all",
        senders: "all",
        recipients: "all",
        assets: [
          {
            id: asset2,
            name: "TestAsset",
            issuingBlockchainRid: Buffer.alloc(32),
            minAmount: 20n,
          },
        ],
        timeoutDays: 1,
      },
    ];

    expect(rules).toEqual(expectedResponse);
  });

  it("correctly groups rules by strategy when rule properties have 'all' values", async () => {
    const response: TransferStrategyRuleRaw[] = [
      {
        strategies: ["fee"],
        blockchains: {
          allow_all: true,
          allowed_values: [],
        },
        senders: {
          allow_all: true,
          allowed_values: [],
        },
        recipients: {
          allow_all: true,
          allowed_values: [],
        },
        assets: {
          allow_all: true,
          allowed_values: [],
        },
        require_same_address: false,
        timeout_days: 1,
      },
    ];

    connection.query.mockReturnValueOnce(response);

    const rules = await getTransferStrategyRulesGroupedByStrategy(connection);

    expect(rules).toEqual(
      new Map<string, Map<string, TransferStrategyRuleAmount[]>>([
        [
          "fee",
          new Map<string, TransferStrategyRuleAmount[]>([
            [
              "all",
              [
                {
                  senderBlockchains: "all",
                  senders: "all",
                  recipients: "all",
                  timeoutDays: 1,
                  minAmount: 0n,
                  assets: "all",
                },
              ],
            ],
          ]),
        ],
      ]),
    );
  });

  it("correctly groups rules by strategy when rule properties have multiple values", async () => {
    const response: TransferStrategyRuleRaw[] = [
      {
        blockchains: {
          allow_all: false,
          allowed_values: [blockchain1, blockchain2],
        },
        senders: {
          allow_all: false,
          allowed_values: [sender1, sender2],
        },
        recipients: {
          allow_all: false,
          allowed_values: [recipient1, recipient2],
        },
        assets: {
          allow_all: true,
          allowed_values: [],
        },
        strategies: ["open"],
        timeout_days: 15,
        require_same_address: false,
      },
    ];

    connection.query.mockReturnValueOnce(response);

    const rules = await getTransferStrategyRulesGroupedByStrategy(connection);

    expect(rules).toEqual(
      new Map<string, Map<string, TransferStrategyRuleAmount[]>>([
        [
          "open",
          new Map<string, TransferStrategyRuleAmount[]>([
            [
              "all",
              [
                {
                  senderBlockchains: [blockchain1, blockchain2],
                  senders: [sender1, sender2],
                  recipients: [recipient1, recipient2],
                  timeoutDays: 15,
                  minAmount: 0n,
                  assets: "all",
                },
              ],
            ],
          ]),
        ],
      ]),
    );
  });

  it("correctly groups rules by strategy and assets when having multiple rules with different assets", async () => {
    const response: TransferStrategyRuleRaw[] = [
      {
        strategies: ["fee"],
        blockchains: {
          allow_all: true,
          allowed_values: [],
        },
        senders: {
          allow_all: true,
          allowed_values: [],
        },
        recipients: {
          allow_all: true,
          allowed_values: [],
        },
        require_same_address: false,
        assets: {
          allow_all: false,
          allowed_values: [createAllowedAssets(asset1, 100n)],
        },
        timeout_days: 30,
      },
      {
        strategies: ["fee"],
        blockchains: {
          allow_all: false,
          allowed_values: [blockchain1],
        },
        senders: {
          allow_all: true,
          allowed_values: [],
        },
        recipients: {
          allow_all: true,
          allowed_values: [],
        },
        require_same_address: false,
        assets: {
          allow_all: false,
          allowed_values: [createAllowedAssets(asset2, 50n)],
        },
        timeout_days: 15,
      },
    ];

    connection.query.mockReturnValueOnce(response);

    const rules = await getTransferStrategyRulesGroupedByStrategy(connection);

    expect(rules).toEqual(
      new Map<string, Map<string, TransferStrategyRuleAmount[]>>([
        [
          "fee",
          new Map<string, TransferStrategyRuleAmount[]>([
            [
              formatter.toString(asset1),
              [
                {
                  senderBlockchains: "all",
                  senders: "all",
                  recipients: "all",
                  timeoutDays: 30,
                  minAmount: 100n,
                  assets: [
                    {
                      id: asset1,
                      name: "TestAsset",
                      issuingBlockchainRid: Buffer.alloc(32),
                      minAmount: 100n,
                    },
                  ],
                },
              ],
            ],
            [
              formatter.toString(asset2),
              [
                {
                  senderBlockchains: [blockchain1],
                  senders: "all",
                  recipients: "all",
                  timeoutDays: 15,
                  minAmount: 50n,
                  assets: [
                    {
                      id: asset2,
                      name: "TestAsset",
                      issuingBlockchainRid: Buffer.alloc(32),
                      minAmount: 50n,
                    },
                  ],
                },
              ],
            ],
          ]),
        ],
      ]),
    );
  });

  it("correctly groups rules by strategy and asset when having multiple rules with same asset", async () => {
    const response: TransferStrategyRuleRaw[] = [
      {
        strategies: ["fee"],
        blockchains: {
          allow_all: true,
          allowed_values: [],
        },
        senders: {
          allow_all: false,
          allowed_values: [],
        },
        recipients: {
          allow_all: false,
          allowed_values: [],
        },
        require_same_address: true,
        assets: {
          allow_all: false,
          allowed_values: [createAllowedAssets(asset1, 10n)],
        },
        timeout_days: 30,
      },
      {
        strategies: ["fee"],
        blockchains: {
          allow_all: false,
          allowed_values: [blockchain1],
        },
        senders: {
          allow_all: true,
          allowed_values: [],
        },
        recipients: {
          allow_all: true,
          allowed_values: [],
        },
        require_same_address: false,
        assets: {
          allow_all: false,
          allowed_values: [createAllowedAssets(asset1, 10n)],
        },
        timeout_days: 15,
      },
    ];

    connection.query.mockReturnValueOnce(response);

    const rules = await getTransferStrategyRulesGroupedByStrategy(connection);

    expect(rules).toEqual(
      new Map<string, Map<string, TransferStrategyRuleAmount[]>>([
        [
          "fee",
          new Map<string, TransferStrategyRuleAmount[]>([
            [
              formatter.toString(asset1),
              [
                {
                  senderBlockchains: "all",
                  senders: "current",
                  recipients: "current",
                  timeoutDays: 30,
                  minAmount: 10n,
                  assets: [
                    {
                      id: asset1,
                      name: "TestAsset",
                      issuingBlockchainRid: Buffer.alloc(32),
                      minAmount: 10n,
                    },
                  ],
                },
                {
                  senderBlockchains: [blockchain1],
                  senders: "all",
                  recipients: "all",
                  timeoutDays: 15,
                  minAmount: 10n,
                  assets: [
                    {
                      id: asset1,
                      name: "TestAsset",
                      issuingBlockchainRid: Buffer.alloc(32),
                      minAmount: 10n,
                    },
                  ],
                },
              ],
            ],
          ]),
        ],
      ]),
    );
  });

  it("groups rules by strategy and asset when having more than one strategy", async () => {
    const response: TransferStrategyRuleRaw[] = [
      {
        strategies: ["fee"],
        blockchains: {
          allow_all: true,
          allowed_values: [],
        },
        senders: {
          allow_all: false,
          allowed_values: [],
        },
        recipients: {
          allow_all: false,
          allowed_values: [],
        },
        require_same_address: true,
        assets: {
          allow_all: false,
          allowed_values: [createAllowedAssets(asset1, 10n)],
        },
        timeout_days: 30,
      },
      {
        strategies: ["fee"],
        blockchains: {
          allow_all: false,
          allowed_values: [blockchain1],
        },
        senders: {
          allow_all: true,
          allowed_values: [],
        },
        recipients: {
          allow_all: true,
          allowed_values: [],
        },
        require_same_address: false,
        assets: {
          allow_all: false,
          allowed_values: [createAllowedAssets(asset1, 10n)],
        },
        timeout_days: 15,
      },
      {
        strategies: ["subscription"],
        blockchains: {
          allow_all: true,
          allowed_values: [],
        },
        senders: {
          allow_all: true,
          allowed_values: [],
        },
        recipients: {
          allow_all: true,
          allowed_values: [],
        },
        require_same_address: false,
        assets: {
          allow_all: false,
          allowed_values: [createAllowedAssets(asset1, 2n)],
        },
        timeout_days: 15,
      },
    ];

    connection.query.mockReturnValueOnce(response);

    const rules = await getTransferStrategyRulesGroupedByStrategy(connection);

    expect(rules).toEqual(
      new Map<string, Map<string, TransferStrategyRuleAmount[]>>([
        [
          "fee",
          new Map<string, TransferStrategyRuleAmount[]>([
            [
              formatter.toString(asset1),
              [
                {
                  senderBlockchains: "all",
                  senders: "current",
                  recipients: "current",
                  timeoutDays: 30,
                  minAmount: 10n,
                  assets: [
                    {
                      id: asset1,
                      name: "TestAsset",
                      issuingBlockchainRid: Buffer.alloc(32),
                      minAmount: 10n,
                    },
                  ],
                },
                {
                  senderBlockchains: [blockchain1],
                  senders: "all",
                  recipients: "all",
                  timeoutDays: 15,
                  minAmount: 10n,
                  assets: [
                    {
                      id: asset1,
                      name: "TestAsset",
                      issuingBlockchainRid: Buffer.alloc(32),
                      minAmount: 10n,
                    },
                  ],
                },
              ],
            ],
          ]),
        ],
        [
          "subscription",
          new Map<string, TransferStrategyRuleAmount[]>([
            [
              formatter.toString(asset1),
              [
                {
                  senderBlockchains: "all",
                  senders: "all",
                  recipients: "all",
                  timeoutDays: 15,
                  minAmount: 2n,
                  assets: [
                    {
                      id: asset1,
                      name: "TestAsset",
                      issuingBlockchainRid: Buffer.alloc(32),
                      minAmount: 2n,
                    },
                  ],
                },
              ],
            ],
          ]),
        ],
      ]),
    );
  });
});
