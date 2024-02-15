import { DictPair, QueryObject, RawGtv } from "postchain-client";
import { PagedResponse } from "@ft4/types";
import { PaginatedEntity } from "./types";
import { Queryable } from "postchain-client";

/**
 *
 * @param session to use to make queries to blockchain
 * @param query the query to perform
 * @param dataMapper
 * @template T type of entity that will be returned (note: Type of a single entity, not a list)
 * @template V type of data returned from the blockchain
 * @returns an object that contains a method to fetch a page from a paginated endpoint
 */
export async function retrievePaginatedEntity<
  T,
  V extends RawGtv,
  R extends PagedResponse<V> = PagedResponse<V>,
>(
  session: Queryable,
  query: QueryObject<R, DictPair>,
  dataMapper: (arg: V[]) => T[],
): Promise<PaginatedEntity<T>> {
  const res = await session.query(query);
  return {
    data: dataMapper(res?.data || []),
    nextCursor: res?.next_cursor || null,
  };
}
