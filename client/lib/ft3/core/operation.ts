import GtvSerializable from "./gtv";

export default class Operation {
  readonly name: string;
  readonly args: Array<GtvSerializable | null>;

  constructor(name: string, ...args: Array<GtvSerializable | null>) {
    if (!name) {
      throw new Error("Missing operation name");
    }

    this.name = name;
    this.args = args;
  }
}
