import { GtvEncodable } from "./gtv";

export default class Operation {
  readonly name: string;
  readonly args: Array<GtvEncodable | null>;

  constructor(name: string, ...args: Array<GtvEncodable | null>) {
    if (!name) {
      throw new Error("Missing operation name");
    }

    this.name = name;
    this.args = args;
  }
}
