import { EntityRetreiver, PaginatedEntity, QueryObject } from "./types";
import { Connection, PagedResponse } from "../types";

export function createEntityRetriever<
  T,
  V,
  R extends PagedResponse<V> = PagedResponse<V>
>(
  session: Connection,
  query: QueryObject,
  dataMapper: (arg: V[]) => T[]
): EntityRetreiver<T> {
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
