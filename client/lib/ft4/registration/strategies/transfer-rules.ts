import { Queryable, formatter } from "postchain-client";
import {
  AllowedAssets,
  TransferStrategyRuleRaw,
  TransferStrategyRuleRawV2,
} from "./types";
import { transferRules } from "./queries";
import {
  TransferStrategyRule,
  AssetLimit,
  TransferStrategyRuleAmount,
  TransferStrategyRulePartial,
} from "@ft4/registration/types";

/**
 * Fetches all transfer strategy rules configured on the chain
 * @param queryable - object to use when querying the blockchain
 * @returns list of transfer strategy rules
 */
export async function getTransferStrategyRules(
  queryable: Queryable,
): Promise<TransferStrategyRule[]> {
  const rules = await queryable.query(transferRules());
  return rules.map((rule) => mapTransferStrategyRule(mapResponseToRaw(rule)));
}

/**
 * Fetches all transfer strategy rules, configured on the chain, grouped by strategies and assets
 *
 * The return type can be read as:
 * ```
 * Map<
 *     strategyName: string,
 *     Map<assetId: string, TransferStrategyRuleAmount[]>
 * >
 * ```
 * where `assetId` will be `"all"` if a certain strategy accepts all assets
 *
 * @param queryable - object to use when querying the blockchain
 * @returns a map of transfer strategy rules grouped by strategies and assets.
 */
export async function getTransferStrategyRulesGroupedByStrategy(
  queryable: Queryable,
): Promise<Map<string, Map<string, TransferStrategyRuleAmount[]>>> {
  const rules = await queryable.query(transferRules());
  const rulesMap = new Map<string, Map<string, TransferStrategyRuleAmount[]>>();
  for (const rule of rules) {
    const rawRule = mapResponseToRaw(rule);
    const assets =
      rawRule.assets?.allow_all ?? true
        ? [{ id: "all", amount: 0n }]
        : rawRule.assets?.allowed_values.map(({ id, min_amount }) => ({
            id: formatter.toString(id),
            amount: min_amount,
          })) ?? [];

    for (const strategy of rawRule.strategies) {
      for (const asset of assets) {
        if (!rulesMap.has(strategy)) {
          rulesMap.set(
            strategy,
            new Map<string, TransferStrategyRuleAmount[]>(),
          );
        }

        const strategyMap = rulesMap.get(strategy)!;
        const assetRules = strategyMap.get(asset.id) || [];

        strategyMap.set(asset.id, [
          ...assetRules,
          mapTransferStrategyRuleAmount(
            {
              ...rawRule,
              blockchains: rawRule.blockchains,
              senders: rawRule.senders,
              recipients: rawRule.recipients,
              require_same_address: rawRule.require_same_address,
              assets: rawRule.assets,
            },
            asset.amount,
          ),
        ]);
      }
    }
  }

  return rulesMap;
}

/**
 * Maps subset of transfer strategy rule properties that are common for
 * `getTransferStrategyRules` and `getTransferStrategyRulesGroupedByStrategy` functions
 * @param rule - raw rule returned from blockchain
 * @returns TransferStrategyRulePartial object
 */
export function mapTransferStrategyRulePartial(
  rule: TransferStrategyRuleRawV2,
): TransferStrategyRulePartial {
  return {
    senderBlockchains: rule.blockchains.allow_all
      ? "all"
      : rule.blockchains.allowed_values,

    senders:
      rule.require_same_address ||
      (rule.senders.allowed_values.length === 0 && !rule.senders.allow_all)
        ? "current"
        : rule.senders.allow_all
          ? "all"
          : rule.senders.allowed_values,

    recipients:
      rule.require_same_address ||
      (rule.recipients.allowed_values.length === 0 &&
        !rule.recipients.allow_all)
        ? "current"
        : rule.recipients.allow_all
          ? "all"
          : rule.recipients.allowed_values,

    assets: !rule.assets
      ? "all"
      : rule.assets.allow_all
        ? "all"
        : rule.assets.allowed_values.map(mapAssetLimit),

    timeoutDays: rule.timeout_days,
  };
}

/**
 * Maps transfer strategy rule returned from blockchain to client side type
 * @param rule - raw rule returned from blockchain
 * @returns TransferStrategyRule object
 */
export function mapTransferStrategyRule(
  rule: TransferStrategyRuleRawV2,
): TransferStrategyRule {
  return {
    ...mapTransferStrategyRulePartial(rule),
    strategies: rule.strategies,
  };
}

/**
 * Maps transfer strategy rule returned from blockchain to client side type
 * @param rule - raw rule returned from object
 * @param minAmount - min transfer amount for this rule
 * @returns TransferStrategyRuleAmount object
 */
export function mapTransferStrategyRuleAmount(
  rule: TransferStrategyRuleRawV2,
  minAmount: bigint,
): TransferStrategyRuleAmount {
  return {
    senderBlockchains: rule.blockchains.allow_all
      ? "all"
      : rule.blockchains.allowed_values,
    senders: rule.require_same_address
      ? "current"
      : rule.senders.allow_all
        ? "all"
        : rule.senders.allowed_values,
    recipients: rule.require_same_address
      ? "current"
      : rule.recipients.allow_all
        ? "all"
        : rule.recipients.allowed_values,
    assets:
      rule.assets?.allow_all ?? true
        ? "all"
        : rule.assets?.allowed_values.map(mapAssetLimit) ?? [],
    timeoutDays: rule.timeout_days,
    minAmount,
  };
}

/**
 * Maps transfer strategy rule raw asset limit
 * @param assetLimit - raw asset limit
 * @returns AssetLimit object
 */
export function mapAssetLimit(assetLimit: AllowedAssets): AssetLimit {
  return {
    id: assetLimit.id,
    name: assetLimit.name,
    issuingBlockchainRid: assetLimit.issuing_blockchain_rid,
    minAmount: assetLimit.min_amount,
  };
}

function mapResponseToRaw(
  rule: TransferStrategyRuleRaw,
): TransferStrategyRuleRawV2 {
  return {
    ...rule,
    assets: {
      allow_all: rule.allow_all_assets,
      allowed_values: rule.asset_limits,
    },
  };
}
