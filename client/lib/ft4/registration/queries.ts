import { Operation, QueryObject, RawGtxOp } from "postchain-client";

export function registerAccountMessage(
  strategyOperation: Operation,
  registerAccountOperation: Operation,
): QueryObject<
  string,
  { strategy_operation: RawGtxOp; register_account_operation: RawGtxOp }
> {
  return {
    name: "ft4.get_register_account_message",
    args: {
      strategy_operation: [
        strategyOperation.name,
        strategyOperation.args || [],
      ],
      register_account_operation: [
        registerAccountOperation.name,
        registerAccountOperation.args || [],
      ],
    },
  };
}
