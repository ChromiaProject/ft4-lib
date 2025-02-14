import { Asset, ASSET_TYPE_FT4, Balance, createAmount } from "@ft4/asset";
import { Connection } from "@ft4/ft-session";
import { TransferStrategyRuleAmount } from "@ft4/registration";
import {
  findValidStrategyRulesAndGetLowestAmountOrZero,
  getValidRules,
  isValidParticipantRule,
  isValidSenderBlockchainRule,
  isValidAssetRule,
} from "@ft4/registration/utils";
import { Account } from "@ft4/accounts/types";
import { mapTransferStrategyRule } from "@ft4/registration/strategies";

const MOCKS = {
  ASSET: {
    NAME: "Test Token",
    TEST_ASSET_NAME: "TestAsset",
    DIFFERENT_ASSET_NAME: "DifferentAsset",
    SYMBOL: "TEST",
    DECIMALS: 8,
    ICON_URL: "https://example.com/icon.png",
    SUPPLY: "1000000000000",
    INITIAL_BALANCE: "100",
    TEST_SUPPLY: "10000",
  },
  AMOUNTS: {
    HIGH_AMOUNT: "10000000000",
    LOW_AMOUNT: "1000000000",
    SMALL_AMOUNT: "100",
    MEDIUM_AMOUNT: "200",
    TINY_AMOUNT: "50",
    MIN_AMOUNT_1: "100",
    MIN_AMOUNT_2: "5000",
    HIGH_MIN_AMOUNT: "20000",
  },
  BUFFER: {
    SIZE: 32,
    FILL_VALUE: 0,
    DIFFERENT_VALUE: "aa",
  },
  PARTICIPANTS: {
    ALL: "all",
    CURRENT: "current",
  },
  TIMEOUT_DAYS: {
    DEFAULT: 10,
    TEST_TIMEOUT: 7,
  },
  BALANCE: {
    TEST_AMOUNT: "1000",
  },
  ERROR_MESSAGES: {
    NO_VALID_RULES:
      "No valid rules found for the account registration strategy",
    SENDER_NOT_ALLOWED: "Sender account not allowed",
    RECIPIENT_NOT_ALLOWED: "Recipient account not allowed",
    INSUFFICIENT_BALANCE: "Insufficient balance. Registration failed.",
  },
} as const;

describe("Strategy Rules Validation", () => {
  const mockBuffer = Buffer.alloc(MOCKS.BUFFER.SIZE, MOCKS.BUFFER.FILL_VALUE);
  const differentBuffer = Buffer.from(MOCKS.BUFFER.DIFFERENT_VALUE);

  const mockConnection: jest.Mocked<Connection> = {
    getAccountById: jest.fn().mockResolvedValue(null),
  } as any;

  const mockAsset: Asset = {
    id: mockBuffer,
    name: MOCKS.ASSET.NAME,
    symbol: MOCKS.ASSET.SYMBOL,
    decimals: MOCKS.ASSET.DECIMALS,
    blockchainRid: mockBuffer,
    iconUrl: MOCKS.ASSET.ICON_URL,
    type: ASSET_TYPE_FT4,
    supply: BigInt(MOCKS.ASSET.TEST_SUPPLY),
  };

  const mockBalance: Balance = {
    amount: createAmount(MOCKS.AMOUNTS.SMALL_AMOUNT, MOCKS.ASSET.DECIMALS),
    asset: mockAsset,
  };

  const mockAccount = {
    id: mockBuffer,
    blockchainRid: mockBuffer,
    connection: mockConnection,
    getBalanceByAssetId: jest.fn(),
    getBalances: jest.fn(),
    isAuthDescriptorValid: jest.fn(),
    getMainAuthDescriptor: jest.fn(),
    getAuthDescriptors: jest.fn(),
    getAuthDescriptorById: jest.fn(),
    getAuthDescriptorsBySigner: jest.fn(),
    getRateLimit: jest.fn(),
    getTransferHistory: jest.fn(),
    getTransferHistoryEntry: jest.fn(),
    getPendingCrosschainTransfers: jest.fn(),
    getLastPendingCrosschainTransfer: jest.fn(),
  } as Account;

  const createRule = (
    overrides: Partial<TransferStrategyRuleAmount> = {},
  ): TransferStrategyRuleAmount => ({
    senderBlockchains: MOCKS.PARTICIPANTS.ALL,
    senders: MOCKS.PARTICIPANTS.ALL,
    recipients: MOCKS.PARTICIPANTS.ALL,
    assets: MOCKS.PARTICIPANTS.ALL, // todo fix later
    minAmount: BigInt(MOCKS.AMOUNTS.SMALL_AMOUNT),
    timeoutDays: MOCKS.TIMEOUT_DAYS.DEFAULT,
    ...overrides,
  });

  describe("findValidStrategyRulesAndGetLowestAmountOrZero", () => {
    it("returns undefined when rules is undefined", async () => {
      const result = await findValidStrategyRulesAndGetLowestAmountOrZero(
        undefined,
        mockAccount,
        mockAsset,
      );
      expect(result).toBeUndefined();
    });

    it("returns undefined when rules array is empty", async () => {
      const result = await findValidStrategyRulesAndGetLowestAmountOrZero(
        [],
        mockAccount,
        mockAsset,
      );
      expect(result).toBeUndefined();
    });

    it("throws an error when account balance is null", async () => {
      mockConnection.getAccountById.mockResolvedValueOnce(null);

      const promise = findValidStrategyRulesAndGetLowestAmountOrZero(
        [createRule()],
        mockAccount,
        mockAsset,
      );
      await expect(promise).rejects.toThrow(
        MOCKS.ERROR_MESSAGES.INSUFFICIENT_BALANCE,
      );
    });

    it("returns amount after rules validation", async () => {
      const rule = {
        strategies: ["test-strategy"],
        blockchains: {
          allow_all: false,
          allowed_values: [mockBuffer],
        },
        senders: {
          allow_all: false,
          allowed_values: [mockBuffer],
        },
        recipients: {
          allow_all: false,
          allowed_values: [mockBuffer],
        },
        require_same_address: false,
        timeout_days: MOCKS.TIMEOUT_DAYS.TEST_TIMEOUT,
        assets: {
          allow_all: false,
          allowed_values: [
            {
              id: mockBuffer,
              name: MOCKS.ASSET.NAME,
              issuing_blockchain_rid: mockBuffer,
              min_amount: BigInt(MOCKS.AMOUNTS.MIN_AMOUNT_1),
            },
          ],
        },
      };

      const mockSpecificBalance: Balance = {
        amount: createAmount(MOCKS.BALANCE.TEST_AMOUNT, MOCKS.ASSET.DECIMALS),
        asset: {
          ...mockAsset,
          id: mockBuffer,
          name: MOCKS.ASSET.NAME,
          blockchainRid: mockBuffer,
          supply: BigInt(MOCKS.ASSET.TEST_SUPPLY),
        },
      };

      mockConnection.getAccountById.mockResolvedValueOnce(mockAccount);
      (mockAccount.getBalanceByAssetId as jest.Mock).mockResolvedValueOnce(
        mockSpecificBalance,
      );

      const mappedRule: TransferStrategyRuleAmount = {
        ...mapTransferStrategyRule(rule),
        minAmount: rule.assets.allowed_values[0].min_amount,
      };

      const result = await findValidStrategyRulesAndGetLowestAmountOrZero(
        [mappedRule],
        mockAccount,
        mockSpecificBalance.asset,
      );

      expect(JSON.stringify(result)).toStrictEqual(
        JSON.stringify(BigInt(MOCKS.AMOUNTS.MIN_AMOUNT_1)),
      );
    });

    it("returns lowest amount from multiple valid rules", async () => {
      const mockHighBalance: Balance = {
        amount: createAmount(MOCKS.AMOUNTS.HIGH_AMOUNT, MOCKS.ASSET.DECIMALS),
        asset: mockAsset,
      };

      mockConnection.getAccountById.mockResolvedValueOnce(mockAccount);
      (mockAccount.getBalanceByAssetId as jest.Mock).mockResolvedValueOnce(
        mockHighBalance,
      );

      const rules = [
        createRule({ minAmount: BigInt(MOCKS.AMOUNTS.MEDIUM_AMOUNT) }),
        createRule({ minAmount: BigInt(MOCKS.AMOUNTS.SMALL_AMOUNT) }),
        createRule({ minAmount: BigInt(MOCKS.AMOUNTS.HIGH_AMOUNT) }),
      ];

      const result = await findValidStrategyRulesAndGetLowestAmountOrZero(
        rules,
        mockAccount,
        mockHighBalance.asset,
      );
      expect(JSON.stringify(result)).toStrictEqual(
        JSON.stringify(BigInt(MOCKS.AMOUNTS.SMALL_AMOUNT)),
      );
    });
  });

  describe("getValidRules", () => {
    it("returns empty array when no rules are valid", () => {
      const differentAsset = {
        ...mockAsset,
        id: differentBuffer,
        blockchainRid: differentBuffer,
      };

      const mockBalanceHighAmount = {
        ...mockBalance,
        amount: createAmount(MOCKS.AMOUNTS.HIGH_AMOUNT, MOCKS.ASSET.DECIMALS),
      };

      const rules = [
        createRule({ senderBlockchains: differentBuffer }),
        createRule({ senders: differentBuffer }),
        createRule({ recipients: differentBuffer }),
        createRule({
          minAmount: BigInt(MOCKS.AMOUNTS.HIGH_AMOUNT),
          assets: [
            {
              id: differentAsset.id,
              name: MOCKS.ASSET.DIFFERENT_ASSET_NAME,
              issuingBlockchainRid: differentAsset.blockchainRid,
              minAmount: BigInt(MOCKS.AMOUNTS.MEDIUM_AMOUNT),
            },
          ],
        }),
      ];

      const result = getValidRules(rules, mockAccount, mockBalanceHighAmount);
      expect(result).toHaveLength(0);
    });

    it("returns all valid rules", () => {
      const validRules = [
        createRule(),
        createRule({ minAmount: BigInt(MOCKS.AMOUNTS.SMALL_AMOUNT) }),
      ];

      const result = getValidRules(validRules, mockAccount, mockBalance);
      expect(JSON.stringify(result)).toStrictEqual(JSON.stringify(validRules));
    });

    it("filters mixed valid and invalid rules", () => {
      const rules = [
        createRule({ senderBlockchains: differentBuffer }),
        createRule(),
        createRule({ senders: differentBuffer }),
        createRule({ minAmount: BigInt(MOCKS.AMOUNTS.TINY_AMOUNT) }),
      ];

      const result = getValidRules(rules, mockAccount, mockBalance);
      expect(result).toHaveLength(2);
      expect(JSON.stringify(result)).toStrictEqual(
        JSON.stringify([rules[1], rules[3]]),
      );
    });

    it("filters rules with valid blockchain but invalid participants", () => {
      const rules = [
        createRule({ senders: differentBuffer, recipients: differentBuffer }),
      ];

      const result = getValidRules(rules, mockAccount, mockBalance);
      expect(result).toHaveLength(0);
    });
  });

  describe("isValidParticipantRule", () => {
    it("returns true for 'all' participant", () => {
      expect(isValidParticipantRule(MOCKS.PARTICIPANTS.ALL, mockBuffer)).toBe(
        true,
      );
    });

    it("returns true for 'current' participant", () => {
      expect(
        isValidParticipantRule(MOCKS.PARTICIPANTS.CURRENT, mockBuffer),
      ).toBe(true);
    });

    it("returns true for matching single participant", () => {
      expect(isValidParticipantRule(mockBuffer, mockBuffer)).toBe(true);
    });

    it("returns false for non-matching single participant", () => {
      const differentAccount = Buffer.from(MOCKS.BUFFER.DIFFERENT_VALUE);
      expect(isValidParticipantRule(differentAccount, mockBuffer)).toBe(false);
    });
  });

  describe("isValidSenderBlockchainRule", () => {
    it("returns true for 'all' blockchain", () => {
      expect(
        isValidSenderBlockchainRule(MOCKS.PARTICIPANTS.ALL, mockBuffer),
      ).toBe(true);
    });

    it("returns true for matching single blockchain", () => {
      expect(isValidSenderBlockchainRule(mockBuffer, mockBuffer)).toBe(true);
    });

    it("returns false for non-matching single blockchain", () => {
      expect(isValidSenderBlockchainRule(differentBuffer, mockBuffer)).toBe(
        false,
      );
    });

    it("returns true for array containing matching blockchain", () => {
      const blockchains = [differentBuffer, mockBuffer];
      expect(isValidSenderBlockchainRule(blockchains, mockBuffer)).toBe(true);
    });

    it("returns false for array containing only non-matching blockchains", () => {
      const blockchains = [differentBuffer, Buffer.from("bb")];
      expect(isValidSenderBlockchainRule(blockchains, mockBuffer)).toBe(false);
    });
  });

  describe("isValidAssetRule", () => {
    const mockAsset: Asset = {
      id: Buffer.alloc(MOCKS.BUFFER.SIZE, MOCKS.BUFFER.FILL_VALUE),
      name: MOCKS.ASSET.TEST_ASSET_NAME,
      blockchainRid: Buffer.alloc(MOCKS.BUFFER.SIZE, MOCKS.BUFFER.FILL_VALUE),
      type: ASSET_TYPE_FT4,
      decimals: 8,
      supply: BigInt(MOCKS.ASSET.TEST_SUPPLY),
      symbol: MOCKS.ASSET.SYMBOL,
      iconUrl: MOCKS.ASSET.ICON_URL,
    };

    it("returns true when assets rule is 'all'", () => {
      expect(isValidAssetRule("all", mockAsset)).toBe(true);
    });

    it("returns true when asset ID matches", () => {
      const assetRule = {
        id: mockAsset.id,
        name: mockAsset.name,
        issuingBlockchainRid: mockAsset.blockchainRid,
        minAmount: BigInt(MOCKS.AMOUNTS.MIN_AMOUNT_1),
      };

      expect(isValidAssetRule([assetRule], mockAsset)).toBe(true);
    });

    it("returns false when asset ID doesn't match", () => {
      const differentId = Buffer.from(MOCKS.BUFFER.DIFFERENT_VALUE);
      const assetRule = {
        id: differentId,
        name: mockAsset.name,
        issuingBlockchainRid: mockAsset.blockchainRid,
        minAmount: BigInt(MOCKS.AMOUNTS.MIN_AMOUNT_1),
      };
      expect(isValidAssetRule([assetRule], mockAsset)).toBe(false);
    });

    it("returns false when asset name matches but blockchain RID doesn't", () => {
      const differentBlockchainRid = Buffer.from(MOCKS.BUFFER.DIFFERENT_VALUE);
      const assetRule = {
        id: mockAsset.id,
        name: mockAsset.name,
        issuingBlockchainRid: differentBlockchainRid,
        minAmount: BigInt(MOCKS.AMOUNTS.MIN_AMOUNT_1),
      };
      expect(isValidAssetRule([assetRule], mockAsset)).toBe(false);
    });

    it("returns false when neither ID nor name+blockchainRID match", () => {
      const assetRule = {
        id: mockAsset.id,
        name: "DifferentName",
        issuingBlockchainRid: Buffer.from(MOCKS.BUFFER.DIFFERENT_VALUE),
        minAmount: BigInt(MOCKS.AMOUNTS.MIN_AMOUNT_1),
      };
      expect(isValidAssetRule([assetRule], mockAsset)).toBe(false);
    });

    it("returns false for empty asset rules array", () => {
      expect(isValidAssetRule([], mockAsset)).toBe(false);
    });

    it("returns true if any rule in the array matches", () => {
      const assetRules = [
        {
          id: Buffer.from(MOCKS.BUFFER.DIFFERENT_VALUE),
          name: MOCKS.ASSET.DIFFERENT_ASSET_NAME,
          issuingBlockchainRid: Buffer.from(MOCKS.BUFFER.DIFFERENT_VALUE),
          minAmount: BigInt(MOCKS.AMOUNTS.MIN_AMOUNT_1),
        },
        {
          id: mockAsset.id,
          name: mockAsset.name,
          issuingBlockchainRid: mockAsset.blockchainRid,
          minAmount: BigInt(MOCKS.AMOUNTS.MIN_AMOUNT_1),
        },
      ];
      expect(isValidAssetRule(assetRules, mockAsset)).toBe(true);
    });

    it("returns false when asset names do not match", () => {
      const assetRule = {
        name: "DifferentAsset",
        minAmount: BigInt(MOCKS.AMOUNTS.MIN_AMOUNT_1),
      };
      expect(isValidAssetRule([assetRule], mockAsset)).toBe(false);
    });

    it("returns false when minAmount is greater than asset supply", () => {
      const assetRule = {
        name: mockAsset.name,
        minAmount: BigInt(MOCKS.AMOUNTS.HIGH_MIN_AMOUNT), // 20000 > 10000 (supply)
      };
      expect(isValidAssetRule([assetRule], mockAsset)).toBe(false);
    });

    it("returns true when minAmount is less than asset supply", () => {
      const assetRule = {
        name: mockAsset.name,
        minAmount: BigInt(MOCKS.AMOUNTS.MIN_AMOUNT_1), // 100 < 10000 (supply)
      };
      expect(isValidAssetRule([assetRule], mockAsset)).toBe(true);
    });
  });
});
