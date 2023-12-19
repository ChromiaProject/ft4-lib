import { EntityRetriever, PaginatedEntity } from "./types";
import { Connection, PagedResponse } from "../types";
import { DictPair, QueryObject, RawGtv } from "postchain-client";

/**
 *
 * @param session to use to make queries to blockchain
 * @param query the query to perform
 * @param dataMapper
 * @template T type of entity that will be returned (note: Type of a single entity, not a list)
 * @template V type of data returned from the blockchain
 * @returns an object that contains a method to fetch a page from a paginated endpoint
 */
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
    /**
     * Retrieves a page of entities from a paginated query
     * @returns A promise that resolves to the paginated entity
     */
    retrieve: async (): Promise<PaginatedEntity<T>> => {
      const res = await session.query(query);
      return {
        data: dataMapper(res?.data || []),
        nextCursor: res?.next_cursor || null,
      };
    },
  });
}
