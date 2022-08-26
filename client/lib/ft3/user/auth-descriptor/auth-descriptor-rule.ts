import GtvSerializable from "../../core/gtv";

export default interface AuthDescriptorRule extends GtvSerializable {}

export class Rules {
  static get blockHeight(): RuleVariable {
    return new RuleVariable("block_height");
  }

  static get blockTime(): RuleVariable {
    return new RuleVariable("block_time");
  }

  static get operationCount(): RuleVariable {
    return new RuleVariable("op_count");
  }
}

class RuleVariable {
  constructor(readonly variable: string) {}

  lessThan(value: number): RuleExpression {
    return this.expression("lt", value);
  }

  lessOrEqual(value: number): RuleExpression {
    return this.expression("le", value);
  }

  equal(value: number): RuleExpression {
    return this.expression("eq", value);
  }

  greaterThan(value: number): RuleExpression {
    return this.expression("gt", value);
  }

  greaterOrEqual(value: number): RuleExpression {
    return this.expression("ge", value);
  }

  private expression(operator: string, value: number): RuleExpression {
    return new RuleExpression(this.variable, operator, value);
  }
}

class RuleExpression implements AuthDescriptorRule {
  constructor(
    readonly name: string,
    readonly operator: string,
    readonly value: number
  ) {}

  get and(): RuleCompositeExpressionOperator {
    return new RuleCompositeExpressionOperator(this, "and");
  }

  toGTV(): any[] {
    return [this.name, this.operator, this.value];
  }
}

class RuleCompositeExpressionOperator {
  constructor(
    readonly expression: RuleExpression | RuleCompositeExpression,
    readonly operator: string
  ) {}

  get blockHeight(): RuleCompositeExpressionVariable {
    return new RuleCompositeExpressionVariable(
      this.expression,
      "block_height",
      this.operator
    );
  }

  get blockTime(): RuleCompositeExpressionVariable {
    return new RuleCompositeExpressionVariable(
      this.expression,
      "block_time",
      this.operator
    );
  }

  get operationCount(): RuleCompositeExpressionVariable {
    return new RuleCompositeExpressionVariable(
      this.expression,
      "op_count",
      this.operator
    );
  }
}

class RuleCompositeExpressionVariable {
  constructor(
    readonly expression: RuleExpression | RuleCompositeExpression,
    readonly name: string,
    readonly operator: string
  ) {}

  lessThan(value: number): RuleCompositeExpression {
    return this.compositeExpression("lt", value);
  }

  lessOrEqual(value: number): RuleCompositeExpression {
    return this.compositeExpression("le", value);
  }

  equal(value: number): RuleCompositeExpression {
    return this.compositeExpression("eq", value);
  }

  greaterThan(value: number): RuleCompositeExpression {
    return this.compositeExpression("gt", value);
  }

  greaterOrEqual(value: number): RuleCompositeExpression {
    return this.compositeExpression("ge", value);
  }

  private compositeExpression(
    operator: string,
    value: number
  ): RuleCompositeExpression {
    return new RuleCompositeExpression(
      this.operator,
      this.expression,
      new RuleExpression(this.name, operator, value)
    );
  }
}

class RuleCompositeExpression implements AuthDescriptorRule {
  constructor(
    readonly operator: string,
    readonly left: RuleExpression | RuleCompositeExpression,
    readonly right: RuleExpression
  ) {}

  get and(): RuleCompositeExpressionOperator {
    return new RuleCompositeExpressionOperator(this, "and");
  }

  toGTV(): any[] {
    return [this.left.toGTV(), this.operator, this.right.toGTV()];
  }
}
