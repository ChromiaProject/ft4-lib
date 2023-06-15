import { GtxClient } from "postchain-client/built/src/gtx/interfaces";
import { EntityRetreiver, Query } from "./types";

export function createEntityRetriever<T, V = any>(
  session: GtxClient,
  query: Query,
  amount: number,
  dataMapper: (arg: V) => T
): EntityRetreiver<T> {
  async function next(): Promise<T | V> {
    const cursor = this.next_cursor;
    const args = new Map(Object.entries(query[1]))
      .set("page_size", amount)
      .set("page_cursor", cursor);
    const res = await session.query(query[0], Object.fromEntries(args));
    this.next_cursor = res.next_cursor;
    return dataMapper(res.data);
  }

  const obj = {
    next_cursor: null,
  };

  obj["next"] = next.bind(obj);

  return obj as EntityRetreiver<T>;
}
