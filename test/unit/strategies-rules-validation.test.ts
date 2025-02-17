import { Asset, ASSET_TYPE_FT4, createAmount } from "@ft4/asset";
import { TransferStrategyRuleAmount } from "@ft4/registration";
import {
  validateCrosschainRegistrationStrategyRules,
  getValidRules,
  isValidParticipantRule,
  isValidSenderBlockchainRule,
  isValidAssetRule,
} from "@ft4/registration/utils";
import { Account } from "@ft4/accounts/types";
import { Buffer } from "buffer";

const TEST_BUFFER_SIZE = 32;
const TEST_BUFFER_FILL = 0;
const TEST_BUFFER_VALUE = "aa";

const MOCKS = {
  BUFFER: {
    SIZE: 32,
    FILL_VALUE: 0,
    DIFFERENT_VALUE: "aa",
    DEFAULT_VALUE: "1234",
  },
  ASSET: {
    NAME: "Test Asset",
    DIFFERENT_NAME: "DifferentAsset",
    SYMBOL: "TEST",
    DECIMALS: 8,
    ICON_URL: "https://example.com/icon.png",
    SUPPLY: "10000",
    TYPE: "ft4",
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
    DEFAULT_BALANCE: "1000",
  },
  PARTICIPANTS: {
    ALL: "all",
    CURRENT: "current",
  },
  TIMEOUT_DAYS: {
    DEFAULT: 10,
    TEST_TIMEOUT: 7,
  },
  ERROR_MESSAGES: {
    NO_VALID_RULES: "No valid rules found. Registration failed.",
    SENDER_BALANCE_NOT_FOUND:
      "Sender's balance not found. Registration failed.",
    SENDER_NOT_ALLOWED: "Sender account not allowed",
    RECIPIENT_NOT_ALLOWED: "Recipient account not allowed",
  },
} as const;

const createTestBuffer = (value: string = MOCKS.BUFFER.DEFAULT_VALUE) =>
  Buffer.from(value);

const createTestAccount = (overrides = {}): Account => ({
  id: createTestBuffer(),
  blockchainRid: createTestBuffer(),
  connection: { getAccountById: jest.fn() } as any,
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
  ...overrides,
});

const createTestAsset = (overrides = {}): Asset => ({
  id: createTestBuffer(),
  name: "Test Asset",
  symbol: "TEST",
  decimals: 8,
  blockchainRid: createTestBuffer(),
  iconUrl: "",
  type: "ft4",
  supply: BigInt(1000),
  ...overrides,
});

const createTestRule = (overrides = {}): TransferStrategyRuleAmount => ({
  senderBlockchains: "all" as const,
  senders: "all" as const,
  recipients: "all" as const,
  assets: "all" as const,
  minAmount: BigInt(100),
  timeoutDays: 10,
  ...overrides,
});

describe("Strategy Rules Validation", () => {
  const mockBuffer = Buffer.alloc(TEST_BUFFER_SIZE, TEST_BUFFER_FILL);
  const differentBuffer = Buffer.from(TEST_BUFFER_VALUE);

  describe("validateCrosschainRegistrationStrategyRules", () => {
    const testAccount = createTestAccount();
    const testAsset = createTestAsset();

    it("returns undefined when rules is undefined", async () => {
      const result = await validateCrosschainRegistrationStrategyRules(
        undefined,
        testAccount,
        testAsset,
        false,
        null,
      );
      expect(result).toBeUndefined();
    });

    it("returns undefined when rules array is empty", async () => {
      const result = await validateCrosschainRegistrationStrategyRules(
        [],
        testAccount,
        testAsset,
        false,
        null,
      );
      expect(result).toBeUndefined();
    });

    it("throws error when sender balance not found", async () => {
      (testAccount.getBalances as jest.Mock).mockResolvedValueOnce({
        data: [],
      });

      await expect(
        validateCrosschainRegistrationStrategyRules(
          [createTestRule()],
          testAccount,
          testAsset,
          false,
          null,
        ),
      ).rejects.toThrow("Sender's balance not found. Registration failed.");
    });

    it("validates rules for non-pending transfer", async () => {
      const balance = {
        amount: createAmount("1000", 8),
        asset: testAsset,
      };

      (testAccount.getBalances as jest.Mock).mockResolvedValueOnce({
        data: [balance],
      });

      const result = await validateCrosschainRegistrationStrategyRules(
        [createTestRule()],
        testAccount,
        testAsset,
        false,
        null,
      );
      expect(result).toBeUndefined();
    });

    it("validates rules for pending transfer", async () => {
      const pendingAmount = BigInt(200);

      (testAccount.getBalances as jest.Mock).mockResolvedValueOnce({
        data: [],
      });

      const result = await validateCrosschainRegistrationStrategyRules(
        [createTestRule()],
        testAccount,
        testAsset,
        true,
        pendingAmount,
      );
      expect(result).toBeUndefined();
    });

    it("throws error when no valid rules for pending transfer", async () => {
      const pendingAmount = BigInt(50);

      (testAccount.getBalances as jest.Mock).mockResolvedValueOnce({
        data: [],
      });

      await expect(
        validateCrosschainRegistrationStrategyRules(
          [createTestRule({ minAmount: BigInt(100) })],
          testAccount,
          testAsset,
          true,
          pendingAmount,
        ),
      ).rejects.toThrow("No valid rules found. Registration failed.");
    });
  });

  describe("getValidRules", () => {
    const testAccount = createTestAccount();
    const testAsset = createTestAsset();
    const balanceAmount = BigInt(1000);

    it("returns empty array when no rules provided", () => {
      expect(getValidRules([], testAccount, testAsset, balanceAmount)).toEqual(
        [],
      );
    });

    it("returns valid rules when all conditions match", () => {
      const rule = createTestRule();
      expect(
        getValidRules([rule], testAccount, testAsset, balanceAmount),
      ).toEqual([rule]);
    });

    it("filters out rules with invalid blockchain", () => {
      const invalidRule = createTestRule({
        senderBlockchains: createTestBuffer("invalid"),
      });
      expect(
        getValidRules([invalidRule], testAccount, testAsset, balanceAmount),
      ).toEqual([]);
    });

    it("filters out rules with insufficient balance", () => {
      const highAmountRule = createTestRule({
        minAmount: BigInt(2000),
      });
      expect(
        getValidRules([highAmountRule], testAccount, testAsset, balanceAmount),
      ).toEqual([]);
    });

    it("returns multiple valid rules", () => {
      const rules = [
        createTestRule({ minAmount: BigInt(100) }),
        createTestRule({ minAmount: BigInt(500) }),
      ];
      expect(
        getValidRules(rules, testAccount, testAsset, balanceAmount),
      ).toEqual(rules);
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
      name: MOCKS.ASSET.NAME,
      blockchainRid: Buffer.alloc(MOCKS.BUFFER.SIZE, MOCKS.BUFFER.FILL_VALUE),
      type: ASSET_TYPE_FT4,
      decimals: 8,
      supply: BigInt(MOCKS.ASSET.SUPPLY),
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
          name: MOCKS.ASSET.DIFFERENT_NAME,
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

    it("returns true when minAmount is less than asset supply", () => {
      const assetRule = {
        name: mockAsset.name,
        minAmount: BigInt(MOCKS.AMOUNTS.MIN_AMOUNT_1),
      };
      expect(isValidAssetRule([assetRule], mockAsset)).toBe(true);
    });
  });
});
