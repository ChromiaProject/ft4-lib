import { Queryable, formatter } from "postchain-client";
import {
  AssetLimit,
  AssetLimitRaw,
  TransferStrategyRuleAmount,
  TransferStrategyRule,
  TransferStrategyRulePartial,
  TransferStrategyRuleRaw,
} from "./types";
import { transferRules } from "./queries";

/**
 * Fetches all transfer strategy rules configured on the chain
 * @param queryable - object to use when querying the blockchain
 * @returns list of transfer strategy rules
 */
export async function getTransferStrategyRules(
  queryable: Queryable,
): Promise<TransferStrategyRule[]> {
  const rules = await queryable.query(transferRules());
  return rules.map(mapTransferStrategyRule);
}

/**
 * Fetches all transfer strategy rules, configured on the chain, grouped by strategies and assets
 * @param queryable - object to use when querying the blockchain
 * @returns a map of transfer strategy rules grouped by strategies and assets
 */
export async function getTransferStrategyRulesGroupedByStrategy(
  queryable: Queryable,
): Promise<Map<string, Map<string, TransferStrategyRuleAmount[]>>> {
  const rules = await queryable.query(transferRules());
  const rulesMap = new Map<string, Map<string, TransferStrategyRuleAmount[]>>();
  for (const rule of rules) {
    const assets = rule.allow_all_assets
      ? [{ id: "all", amount: 0n }]
      : rule.asset_limits.map(({ id, min_amount }) => ({
          id: formatter.toString(id),
          amount: min_amount,
        }));
    for (const strategy of rule.strategies) {
      for (const asset of assets) {
        if (!rulesMap.has(strategy)) {
          rulesMap.set(
            strategy,
            new Map<string, TransferStrategyRuleAmount[]>(),
          );
        }
        if (rulesMap.get(strategy)!.has(asset.id)) {
          rulesMap
            .get(strategy)!
            .get(asset.id)!
            .push(mapTransferStrategyRuleAmount(rule, asset.amount));
        } else {
          rulesMap
            .get(strategy)!
            .set(asset.id, [mapTransferStrategyRuleAmount(rule, asset.amount)]);
        }
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
  rule: TransferStrategyRuleRaw,
): TransferStrategyRulePartial {
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
    timeoutDays: rule.timeout_days,
  };
}

/**
 * Maps transfer strategy rule returned from blockchain to client side type
 * @param rule - raw rule returned from blockchain
 * @returns TransferStrategyRule object
 */
export function mapTransferStrategyRule(
  rule: TransferStrategyRuleRaw,
): TransferStrategyRule {
  return {
    ...mapTransferStrategyRulePartial(rule),
    strategies: rule.strategies,
    assets: rule.allow_all_assets
      ? "all"
      : rule.asset_limits.map(mapAssetLimit),
  };
}

/**
 * Maps transfer strategy rule returned from blockchain to client side type
 * @param rule - raw rule returned from object
 * @param minAmount - min transfer amount for this rule
 * @returns TransferStrategyRuleAmount object
 */
export function mapTransferStrategyRuleAmount(
  rule: TransferStrategyRuleRaw,
  minAmount: bigint,
): TransferStrategyRuleAmount {
  return {
    ...mapTransferStrategyRulePartial(rule),
    minAmount,
  };
}

/**
 * Maps transfer strategy rule raw asset limit
 * @param assetLimit - raw asset limit
 * @returns AssetLimit object
 */
export function mapAssetLimit(assetLimit: AssetLimitRaw): AssetLimit {
  return {
    id: assetLimit.id,
    minAmount: assetLimit.min_amount,
  };
}
