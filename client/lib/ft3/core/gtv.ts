export interface GtvEncodable {
  encodeGtv(): GtvEncoded;
}

type GtvPrimitive = string | number;
export type GtvEncoded =
  | null
  | GtvPrimitive
  | Array<GtvEncoded>
  | { [index: GtvPrimitive]: GtvEncoded };

export function encodeGtv(value?: GtvEncodable): GtvEncoded {
  return value?.encodeGtv() ?? null;
}

declare global {
  interface Array<T> extends GtvEncodable {} //eslint-disable-line @typescript-eslint/no-unused-vars
  interface String extends GtvEncodable {}
  interface Number extends GtvEncodable {}
  interface Buffer extends GtvEncodable {}
  interface Boolean extends GtvEncodable {}
  interface Object extends GtvEncodable {}
}

Buffer.prototype.encodeGtv = function (): GtvEncoded {
  return this.toString("hex");
};

Object.defineProperty(Array.prototype, "encodeGtv", {
  enumerable: false,
  value: function (): GtvEncoded {
    return this.map((element) => encodeGtv(element));
  },
});

String.prototype.encodeGtv = function (): GtvEncoded {
  return this;
};

Number.prototype.encodeGtv = function (): GtvEncoded {
  return this;
};

Boolean.prototype.encodeGtv = function (): GtvEncoded {
  return this ? 1 : 0;
};

Object.defineProperty(Object.prototype, "encodeGtv", {
  enumerable: false,
  writable: true,
  value: function (): GtvEncoded {
    return this;
  },
});
