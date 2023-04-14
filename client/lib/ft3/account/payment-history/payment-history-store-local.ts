import { PaymentHistoryRetriever, PaymentHistoryStore } from "./interfaces";
import { BufferId } from "../../../cryptoUtils";
import { GtxClient } from "postchain-client/built/src/gtx/interfaces";
import { createPaymentHistoryRetriever } from "./payment-history-retrieval";
import {
  paymentHistoryEntryFromJSON,
  paymentHistoryEntryToJSON,
} from "./payment-history-entry";
import { PaymentHistoryEntry } from "./types";
import { formatter } from "postchain-client";

export async function ensurePaymentHistoryStoreLocal(
  session: GtxClient,
  pageSize: number,
  accountId: BufferId
): Promise<PaymentHistoryStore> {
  try {
    return await loadPaymentHistoryStoreLocal(session, accountId, pageSize);
  } catch (error) {
    console.log(`Couldn't load payment history from local storage
    [Reason: ${error.toString()}]
    Creating a new one...`);
    return await createNewPaymentHistoryStoreLocal(
      session,
      accountId,
      pageSize
    );
  }
}

export async function createNewPaymentHistoryStoreLocal(
  session: GtxClient,
  accountId: BufferId,
  pageSize: number
): Promise<PaymentHistoryStore> {
  if (pageSize < 1) throw new Error("Page size must be at least 1");
  const id = formatter.ensureBuffer(accountId);

  const retriever = createPaymentHistoryRetriever(session, accountId);
  const entryCount = await retriever.getTotalCount();
  const pageCount = Math.ceil(entryCount / pageSize);
  const key = `FT_LIB_P_H_S_L_${accountId
    .toString("hex")
    .toUpperCase()}_${retriever.brid.toUpperCase()}`;
  localStorage.removeItem(key);
  return build(id, pageSize, pageCount, entryCount, [], retriever, null, key);
}

export async function loadPaymentHistoryStoreLocal(
  session: GtxClient,
  accountId: BufferId,
  pageSize: number
): Promise<PaymentHistoryStore> {
  if (pageSize < 1) throw new Error("Page size must be at least 1");
  const id = formatter.ensureBuffer(accountId);

  const retriever = createPaymentHistoryRetriever(session, accountId);
  const key = `FT_LIB_P_H_S_L_${accountId
    .toString("hex")
    .toUpperCase()}_${retriever.brid.toUpperCase()}`;

  const data = JSON.parse(localStorage.getItem(key));
  if (!data) throw new Error("Cached payment history not found!");
  const [jsonEntries, oldEntryCount] = data;
  let entries = jsonEntries.map((e) => paymentHistoryEntryFromJSON(e));
  const toAdd = await loadNewerEntries(retriever, oldEntryCount, entries);
  entries = toAdd.concat(entries);
  const entryCount = oldEntryCount + toAdd.length;
  const pageCount = Math.ceil(entryCount / pageSize);
  const lastRowId = entries[entries.legth - 1].rowid;
  return build(
    id,
    pageSize,
    pageCount,
    entryCount,
    entries,
    retriever,
    lastRowId,
    key
  );
}

function build(
  accountId: Buffer,
  pageSize: number,
  pageCount: number,
  entryCount: number,
  _entries: PaymentHistoryEntry[],
  retriever: PaymentHistoryRetriever,
  _lastElementRowid: string | null,
  localStorageKey: string
): PaymentHistoryStore {
  let entries = _entries;
  let lastElementRowid = _lastElementRowid;
  function storeEntries() {
    localStorage.setItem(
      localStorageKey,
      JSON.stringify([
        entries.map((e) => paymentHistoryEntryToJSON(e)),
        entryCount,
      ])
    );
  }
  return Object.freeze({
    accountId: accountId,
    setPageSize: (size: number) => {
      pageSize = size;
    },
    getPageSize: () => pageSize,
    getPageCount: () => pageCount,
    getEntryCount: () => entryCount,
    get: async (page: number): Promise<readonly PaymentHistoryEntry[]> => {
      if (page >= pageCount) {
        throw new Error(
          "Page out of bounds. Sync if you want to fetch " +
            "possible new entries"
        );
      }

      const firstIndexInNextPage = (page + 1) * pageSize;
      while (entries.length < Math.min(firstIndexInNextPage, entryCount)) {
        const [data, next] = await retriever.retrieve(
          // Use fewer queries: ask for all missing elements
          // (chain will return up to 100)
          (page + 1) * pageSize - entries.length,
          lastElementRowid
        );
        entries = entries.concat(data);
        storeEntries();
        lastElementRowid = next[1];
      }
      return Object.freeze(
        entries.slice(page * pageSize, firstIndexInNextPage)
      );
    },
    deletePaymentHistory: () => {
      entries = [];
      localStorage.removeItem(localStorageKey);
    },
    loadAllNewTx: async (): Promise<PaymentHistoryStore | null> => {
      if (entryCount === (await retriever.getTotalCount())) return null;
      const toAdd = await loadNewerEntries(retriever, entryCount, entries);
      entryCount += toAdd.length;
      entries = toAdd.concat(entries);
      storeEntries();

      return build(
        accountId,
        pageSize,
        Math.ceil(entryCount / pageSize),
        entryCount,
        entries,
        retriever,
        lastElementRowid,
        localStorageKey
      );
    },
    isUpToDate: async () => {
      return entryCount === (await retriever.getTotalCount());
    },
  });
}

async function loadNewerEntries(
  retriever: PaymentHistoryRetriever,
  oldCount: number,
  oldEntries: PaymentHistoryEntry[]
): Promise<readonly PaymentHistoryEntry[]> {
  const newCount = await retriever.getTotalCount();
  let newEntriesAmount = newCount - oldCount;
  if (oldEntries.length > 0) {
    let lastElementRowid: string | null = null;
    const oldFirst = oldEntries[0];
    let done = false;
    let toAdd = [];
    while (!done) {
      if (newEntriesAmount < 0) {
        throw new Error(
          "Unexpected error: local payment history might be corrupted"
        );
      }
      const [entries, next] = await retriever.retrieve(
        newEntriesAmount + 1,
        lastElementRowid
      );
      lastElementRowid = next[1];

      const idxOfFirst = entries.findIndex((entry) => {
        return entry.rowid === oldFirst.rowid;
      });
      if (idxOfFirst != -1) {
        done = true;
        toAdd = toAdd.concat(entries.slice(0, idxOfFirst));
      } else {
        toAdd = toAdd.concat(entries);
        newEntriesAmount -= entries.length;
      }
    }
    return Object.freeze(toAdd);
  }
  return [];
}
