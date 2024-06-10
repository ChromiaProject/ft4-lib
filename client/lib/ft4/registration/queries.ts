import { Operation, QueryObject, RawGtxOp } from "postchain-client";

/**
 * Creates a query object for the `get_register_account_message` query.
 * @param strategyOperation - operation corresponding to the strategy that is being used to register the account
 * @param registerAccountOperation - operation that will be used for registering the account
 */
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
