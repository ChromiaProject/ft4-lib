import { EntityRetriever, PaginatedEntity } from "./types";
import { Connection, PagedResponse } from "../types";
import { QueryObject, RawGtv } from "postchain-client";

export function createEntityRetriever<
  T,
  V extends RawGtv,
  R extends PagedResponse<V> = PagedResponse<V>,
>(
  session: Connection,
  query: QueryObject<V>,
  dataMapper: (arg: V[]) => T[],
): EntityRetriever<T> {
  return {
    retrieve: async (): Promise<PaginatedEntity<T>> => {
      const res = await session.query<R>(query);
      return {
        data: dataMapper(res.data),
        nextCursor: res.next_cursor,
      };
    },
  };
}
