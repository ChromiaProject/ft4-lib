import { EntityRetriever, PaginatedEntity } from "./types";
import { Connection, PagedResponse } from "../types";
import { QueryArguments, QueryObject } from "postchain-client";

export function createEntityRetriever<
  T,
  V,
  R extends PagedResponse<V> = PagedResponse<V>
>(
  session: Connection,
  query: QueryObject<QueryArguments>,
  dataMapper: (arg: V[]) => T[]
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
