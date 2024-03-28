import { Operation, QueryObject, RawGtv } from "postchain-client";

export function registerAccountMessage(
  strategyOperation: Operation,
): QueryObject<string, { strategy_name: string; gtv: RawGtv[] }> {
  return {
    name: "ft4.get_register_account_message",
    args: {
      strategy_name: strategyOperation.name,
      gtv: strategyOperation.args || [],
    },
  };
}
