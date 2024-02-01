import { Operation } from "postchain-client";

export interface Strategy {
  getOperation(): Promise<Operation>;
}
