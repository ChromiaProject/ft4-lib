import { EntityRetriever, PaginatedEntity } from "./types";
import { Connection, PagedResponse } from "../types";
import { QueryArguments, QueryObject } from "postchain-client";

class RetrieveError extends Error {
  constructor(msg?: string) {
    super(msg);
    this.message = msg;
    this.name = "RetrieveError";
  }
}

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
    retrieve: async (limit = 100): Promise<PaginatedEntity<T>> => {
      if (limit > 100) throw new RetrieveError("amount needs to be <= 100");
      const res = await session.query<R>(query);
      return {
        data: dataMapper(res.data),
        nextCursor: res.next_cursor,
      };
    },
  };
}
