import { Queryable, formatter } from "postchain-client";
import { AllowedAssets, TransferStrategyRuleRaw } from "./types";
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
  return rules.map(mapTransferStrategyRule);
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
    const assets = rule.assets?.allow_all
      ? [{ id: "all", amount: 0n }]
      : rule.assets?.allowed_values.map(({ id, min_amount }) => ({
          id: formatter.toString(id),
          amount: min_amount,
        })) || [];
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
    assets:
      rule.assets?.allow_all ?? true
        ? "all"
        : rule.assets?.allowed_values.map(mapAssetLimit) ?? [],
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
export function mapAssetLimit(assetLimit: AllowedAssets): AssetLimit {
  return {
    id: assetLimit.id,
    name: assetLimit.name,
    issuingBlockchainRid: assetLimit.issuing_blockchain_rid,
    minAmount: assetLimit.min_amount,
  };
}
