import { Asset, ASSET_TYPE_FT4 } from "@ft4/asset";
import { Connection } from "@ft4/ft-session";
import { TransferStrategyRuleAmount } from "@ft4/registration";
import {
  findValidStrategyRulesAndGetLowestAmountOrZero,
  getValidRules,
  isValidParticipantRule,
  isValidSenderBlockchainRule,
} from "@ft4/registration/utils";

const MOCKS = {
  ASSET: {
    NAME: "Test Token",
    SYMBOL: "TEST",
    DECIMALS: 8,
    ICON_URL: "https://example.com/icon.png",
    SUPPLY: "1000000000000",
    INITIAL_BALANCE: "100",
  },
  AMOUNTS: {
    HIGH_AMOUNT: "10000000000",
    LOW_AMOUNT: "1000000000",
    SMALL_AMOUNT: "100",
    MEDIUM_AMOUNT: "200",
    TINY_AMOUNT: "50",
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
  TIMEOUT_DAYS: 10,
  ERROR_MESSAGES: {
    NO_VALID_RULES:
      "No valid rules found for the account registration strategy",
    SENDER_NOT_ALLOWED: "Sender account not allowed",
    RECIPIENT_NOT_ALLOWED: "Recipient account not allowed",
  },
} as const;

describe("Strategy Rules Validation", () => {
  const mockBuffer = Buffer.alloc(MOCKS.BUFFER.SIZE, MOCKS.BUFFER.FILL_VALUE);
  const differentBuffer = Buffer.from(MOCKS.BUFFER.DIFFERENT_VALUE);

  const mockAsset: Asset = {
    id: mockBuffer,
    name: MOCKS.ASSET.NAME,
    symbol: MOCKS.ASSET.SYMBOL,
    decimals: MOCKS.ASSET.DECIMALS,
    blockchainRid: mockBuffer,
    iconUrl: MOCKS.ASSET.ICON_URL,
    type: ASSET_TYPE_FT4,
    supply: BigInt(MOCKS.ASSET.SUPPLY),
  };

  const createRule = (
    overrides: Partial<TransferStrategyRuleAmount> = {},
  ): TransferStrategyRuleAmount => ({
    senderBlockchains: MOCKS.PARTICIPANTS.ALL,
    senders: MOCKS.PARTICIPANTS.ALL,
    recipients: MOCKS.PARTICIPANTS.ALL,
    minAmount: BigInt(MOCKS.AMOUNTS.SMALL_AMOUNT),
    timeoutDays: MOCKS.TIMEOUT_DAYS,
    ...overrides,
  });

  describe("findValidStrategyRulesAndGetLowestAmountOrZero", () => {
    const mockAccount = {
      getBalanceByAssetId: jest.fn().mockResolvedValue({
        amount: {
          value: BigInt(MOCKS.ASSET.INITIAL_BALANCE),
          decimals: MOCKS.ASSET.DECIMALS,
        },
      }),
    };

    const mockConnection: jest.Mocked<Connection> = {
      getAccountById: jest.fn().mockResolvedValue(mockAccount),
    } as any;

    it("returns undefined when rules is undefined", async () => {
      const result = await findValidStrategyRulesAndGetLowestAmountOrZero(
        undefined,
        mockBuffer,
        mockBuffer,
        mockConnection,
        mockAsset,
      );
      expect(result).toBeUndefined();
    });

    it("returns undefined when rules array is empty", async () => {
      const result = await findValidStrategyRulesAndGetLowestAmountOrZero(
        [],
        mockBuffer,
        mockBuffer,
        mockConnection,
        mockAsset,
      );
      expect(result).toBeUndefined();
    });

    it("handles null account", async () => {
      mockConnection.getAccountById.mockResolvedValueOnce(null);
      const result = await findValidStrategyRulesAndGetLowestAmountOrZero(
        [createRule()],
        mockBuffer,
        mockBuffer,
        mockConnection,
        mockAsset,
      );
      expect(result).toBe(BigInt(0));
    });

    it("handles account with null balance", async () => {
      mockConnection.getAccountById.mockResolvedValueOnce(null);

      const result = await findValidStrategyRulesAndGetLowestAmountOrZero(
        [createRule()],
        mockBuffer,
        mockBuffer,
        mockConnection,
        mockAsset,
      );
      expect(result).toBe(BigInt(0));
    });

    it("returns lowest amount from multiple valid rules", async () => {
      const rules = [
        createRule({ minAmount: BigInt(MOCKS.AMOUNTS.MEDIUM_AMOUNT) }),
        createRule({ minAmount: BigInt(MOCKS.AMOUNTS.SMALL_AMOUNT) }),
        createRule({ minAmount: BigInt(MOCKS.AMOUNTS.HIGH_AMOUNT) }),
      ];

      const result = await findValidStrategyRulesAndGetLowestAmountOrZero(
        rules,
        mockBuffer,
        mockBuffer,
        mockConnection,
        mockAsset,
      );
      expect(result).toBe(BigInt(MOCKS.AMOUNTS.SMALL_AMOUNT));
    });
  });

  describe("getValidRules", () => {
    it("returns empty array when no rules are valid", () => {
      const rules = [
        createRule({ senderBlockchains: differentBuffer }),
        createRule({ senders: differentBuffer }),
        createRule({ recipients: differentBuffer }),
        createRule({ minAmount: BigInt(MOCKS.AMOUNTS.HIGH_AMOUNT) }),
      ];

      const result = getValidRules(
        rules,
        mockBuffer,
        mockBuffer,
        BigInt(MOCKS.AMOUNTS.SMALL_AMOUNT),
      );
      expect(result).toHaveLength(0);
    });

    it("returns all valid rules", () => {
      const validRules = [
        createRule(),
        createRule({ minAmount: BigInt(MOCKS.AMOUNTS.SMALL_AMOUNT) }),
      ];

      const result = getValidRules(
        validRules,
        mockBuffer,
        mockBuffer,
        BigInt(MOCKS.AMOUNTS.MEDIUM_AMOUNT),
      );
      expect(result).toEqual(validRules);
    });

    it("filters mixed valid and invalid rules", () => {
      const rules = [
        createRule({ senderBlockchains: differentBuffer }),
        createRule(),
        createRule({ senders: differentBuffer }),
        createRule({ minAmount: BigInt(MOCKS.AMOUNTS.TINY_AMOUNT) }),
      ];

      const result = getValidRules(
        rules,
        mockBuffer,
        mockBuffer,
        BigInt(MOCKS.AMOUNTS.MEDIUM_AMOUNT),
      );
      expect(result).toHaveLength(2);
      expect(result).toContainEqual(rules[1]);
      expect(result).toContainEqual(rules[3]);
    });

    it("filters rules with valid blockchain but invalid participants", () => {
      const rules = [
        createRule({ senders: differentBuffer, recipients: differentBuffer }),
      ];

      const result = getValidRules(
        rules,
        mockBuffer,
        mockBuffer,
        BigInt(MOCKS.AMOUNTS.MEDIUM_AMOUNT),
      );
      expect(result).toHaveLength(0);
    });

    it("filters rules with valid participants but insufficient balance", () => {
      const rules = [
        createRule({ minAmount: BigInt(MOCKS.AMOUNTS.HIGH_AMOUNT) }),
      ];

      const result = getValidRules(
        rules,
        mockBuffer,
        mockBuffer,
        BigInt(MOCKS.AMOUNTS.SMALL_AMOUNT),
      );
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
});
