import { EnvironmentContext, JestEnvironmentConfig } from "@jest/environment";
import NodeEnvironment from "jest-environment-node"

class TestEnvironment extends NodeEnvironment {
  constructor(config: JestEnvironmentConfig, _context: EnvironmentContext) {
    super(config, _context);
  }

  async setup() {
    this.global.BigInt.prototype["toJSON"] = function() {
      return this.toString()
    }
  }
}

module.exports = TestEnvironment;
