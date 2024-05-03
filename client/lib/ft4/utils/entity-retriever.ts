import { DictPair, QueryObject, RawGtv, Queryable } from "postchain-client";
import { PagedResponse } from "@ft4/ft-session";
import { PaginatedEntity } from "./types";

/**
 *
 * @param queryable - to use to make queries to blockchain
 * @param query - the query to perform
 * @param dataMapper - function that transforms data from the type returned by backend to the type returned to caller
 * @typeParam T - type of entity that will be returned (note: Type of a single entity, not a list)
 * @typeParam V - type of data returned from the blockchain
 * @returns an object that contains a method to fetch a page from a paginated endpoint
 */
export async function retrievePaginatedEntity<
  T,
  V extends RawGtv,
  R extends PagedResponse<V> = PagedResponse<V>,
>(
  queryable: Queryable,
  query: QueryObject<R, DictPair>,
  dataMapper: (arg: V[]) => T[],
): Promise<PaginatedEntity<T>> {
  const res = await queryable.query(query);
  return {
    data: dataMapper(res?.data || []),
    nextCursor: res?.next_cursor || null,
  };
}
