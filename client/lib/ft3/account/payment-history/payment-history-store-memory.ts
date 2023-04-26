import {
  PaymentHistoryRetriever,
  PaymentHistoryStore,
  PaymentHistoryError,
} from "./interfaces";
import { PaymentHistoryEntry } from "./types";
import { BufferId } from "../../../cryptoUtils";
import { GtxClient } from "postchain-client/built/src/gtx/interfaces";
import { createPaymentHistoryRetriever } from "./payment-history-retrieval";
import { formatter } from "postchain-client";

export async function createPaymentHistoryStoreMemory(
  session: GtxClient,
  accountId: BufferId,
  pageSize: number
): Promise<PaymentHistoryStore> {
  if (pageSize < 1)
    throw new PaymentHistoryError("Page size must be at least 1");
  const id = formatter.ensureBuffer(accountId);

  const retriever = createPaymentHistoryRetriever(session, accountId);
  const entryCount = await retriever.getTotalCount();
  const pageCount = Math.ceil(entryCount / pageSize);

  return build(id, pageSize, pageCount, entryCount, [], retriever, null);
}

function build(
  accountId: Buffer,
  pageSize: number,
  pageCount: number,
  entryCount: number,
  entries: PaymentHistoryEntry[],
  retriever: PaymentHistoryRetriever,
  lastElementRowid: string | null
): PaymentHistoryStore {
  let _pageSize = pageSize;
  const _pageCount = pageCount;
  const _entryCount = entryCount;
  let _entries = entries;
  let _lastElementRowid = lastElementRowid;
  return Object.freeze({
    accountId: accountId,
    setPageSize: (size: number) => {
      _pageSize = size;
    },
    getPageSize: () => _pageSize,
    getPageCount: () => _pageCount,
    getEntryCount: () => _entryCount,
    get: async (page: number): Promise<readonly PaymentHistoryEntry[]> => {
      if (page >= _pageCount) {
        throw new PaymentHistoryError(
          "Page out of bounds. Sync if you want to fetch " +
            "possible new entries"
        );
      }

      const firstIndexInNextPage = (page + 1) * _pageSize;
      while (_entries.length < Math.min(firstIndexInNextPage, _entryCount)) {
        const [data, next] = await retriever.retrieve(
          // Use fewer queries: ask for all missing elements
          // (chain will return up to 100)
          (page + 1) * _pageSize - _entries.length,
          _lastElementRowid
        );
        _entries = _entries.concat(data);
        _lastElementRowid = next[1];
      }
      return Object.freeze(
        _entries.slice(page * _pageSize, firstIndexInNextPage)
      );
    },
    deletePaymentHistory: () => {
      _entries = [];
    },
    loadAllNewTx: async (): Promise<PaymentHistoryStore | null> => {
      const newCount = await retriever.getTotalCount();
      const newEntriesAmount = newCount - _entryCount;
      if (_entries.length > 0) {
        const oldFirst = _entries[0];
        _lastElementRowid = null;
        let done = false;
        let toAdd = [];
        const tmpLastElementRowid = _lastElementRowid;
        while (!done) {
          const [entries, next] = await retriever.retrieve(
            newEntriesAmount + 1
          );
          _lastElementRowid = next[1];

          const idxOfFirst = entries.findIndex((entry) => {
            return entry.rowid === oldFirst.rowid;
          });
          if (idxOfFirst != -1) {
            done = true;
            toAdd = toAdd.concat(entries.slice(0, idxOfFirst));
          } else {
            toAdd = toAdd.concat(entries);
          }
        }
        _entries = toAdd.concat(_entries);
        _lastElementRowid = tmpLastElementRowid;
        return build(
          accountId,
          _pageSize,
          Math.ceil(newCount / _pageSize),
          newCount,
          _entries,
          retriever,
          _lastElementRowid
        );
      }
      return null;
    },
    isUpToDate: async () => {
      return _entryCount === (await retriever.getTotalCount());
    },
  });
}
