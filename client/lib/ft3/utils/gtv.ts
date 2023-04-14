import { RawGtv } from "postchain-client/built/src/gtv/types";

export interface GtvCompatible {
  encodeGtv(): RawGtv;
}

export function encodeGtv(value?: GtvCompatible): RawGtv {
  return value?.encodeGtv() ?? null;
}

declare global {
  interface Array<T> extends GtvCompatible {} //eslint-disable-line @typescript-eslint/no-unused-vars
  interface String extends GtvCompatible {}
  interface Number extends GtvCompatible {}
  interface Buffer extends GtvCompatible {}
  interface Boolean extends GtvCompatible {}
  interface Object extends GtvCompatible {}
}

Buffer.prototype.encodeGtv = function (): RawGtv {
  return this;
};

Object.defineProperty(Array.prototype, "encodeGtv", {
  enumerable: false,
  value: function (): RawGtv {
    return this.map((element: GtvCompatible) => encodeGtv(element));
  },
});

String.prototype.encodeGtv = function (): RawGtv {
  return this;
};

Number.prototype.encodeGtv = function (): RawGtv {
  return this;
};

Boolean.prototype.encodeGtv = function (): RawGtv {
  return this ? 1 : 0;
};

Object.defineProperty(Object.prototype, "encodeGtv", {
  enumerable: false,
  writable: true,
  value: function (): RawGtv {
    return Object.entries(this).encodeGtv();
  },
});
