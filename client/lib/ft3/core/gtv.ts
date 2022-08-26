export default interface GtvSerializable {
  toGTV(): any[];
}

export function toGTV(value: GtvSerializable | null | undefined): any {
  return value === null || value === undefined ? null : value.toGTV();
}

declare global {
  interface Array<T> extends GtvSerializable {} //eslint-disable-line @typescript-eslint/no-unused-vars
  interface String extends GtvSerializable {}
  interface Number extends GtvSerializable {}
  interface Buffer extends GtvSerializable {}
  interface Boolean extends GtvSerializable {}
  interface Object extends GtvSerializable {}
}

Buffer.prototype.toGTV = function (): any {
  return this.toString("hex");
};

Object.defineProperty(Array.prototype, "toGTV", {
  enumerable: false,
  value: function (): any[] {
    return this.map((element) => toGTV(element));
  },
});

String.prototype.toGTV = function (): any {
  return this;
};

Number.prototype.toGTV = function (): any {
  return this;
};

Boolean.prototype.toGTV = function (): any {
  return this ? 1 : 0;
};

Object.defineProperty(Object.prototype, "toGTV", {
  enumerable: false,
  writable: true,
  value: function (): any {
    return this;
  },
});
