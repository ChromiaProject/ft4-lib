import { Balance } from "./types";

export function mapBalance(balance: any): Balance {
  const { id, name, brid, amount } = balance;
  return Object.freeze({
    asset: { id, name, brid },
    amount,
  });
}
