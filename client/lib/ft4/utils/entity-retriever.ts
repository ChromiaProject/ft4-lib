import { EntityRetriever, PaginatedEntity } from "./types";
import { Connection, PagedResponse } from "../types";
import { DictPair, QueryObject, RawGtv } from "postchain-client";

export function createEntityRetriever<
  T,
  V extends RawGtv,
  R extends PagedResponse<V> = PagedResponse<V>,
>(
  session: Connection,
  query: QueryObject<R, DictPair>,
  dataMapper: (arg: V[]) => T[],
): EntityRetriever<T> {
  return Object.freeze({
    retrieve: async (): Promise<PaginatedEntity<T>> => {
      const res = await session.query(query);
      return {
        data: dataMapper(res?.data || []),
        nextCursor: res?.next_cursor || null,
      };
    },
  });
}
