import { PaymentHistoryIterator, PaymentHistoryStore } from "./interfaces";
import { PaymentHistoryEntry } from "./types";

export function createPaymentHistoryIterator(
  storage: PaymentHistoryStore
): PaymentHistoryIterator {
  let _currentPage = -1;
  let _storage = storage;
  async function sync() {
    const newStore = await _storage.loadAllNewTx();
    if (_currentPage !== -1 && newStore) {
      const delta = newStore.getEntryCount() - _storage.getEntryCount();
      _currentPage += Math.floor(delta / _storage.getPageSize());
      _storage = newStore;
    }
  }

  async function jumpTo(page: number): Promise<readonly PaymentHistoryEntry[]> {
    _currentPage = page;
    return await _storage.get(_currentPage);
  }

  return Object.freeze({
    getStorage: () => _storage,

    getCurrentPage: () => _currentPage,

    //keeps the first item of the page in the new page
    sync,

    reload: async (): Promise<readonly PaymentHistoryEntry[]> => {
      await sync();
      return await _storage.get(_currentPage);
    },

    //keeps the first item of the page in the new page
    changePageSize: async (
      size: number
    ): Promise<readonly PaymentHistoryEntry[]> => {
      _currentPage = Math.floor((_currentPage * _storage.getPageSize()) / size);
      _storage.setPageSize(size);
      return await _storage.get(_currentPage);
    },

    rewind: async (): Promise<readonly PaymentHistoryEntry[]> => {
      return await jumpTo(0);
    },

    prev: async (): Promise<readonly PaymentHistoryEntry[]> => {
      if (_currentPage === 0) {
        return [];
      }
      _currentPage--;
      return await _storage.get(_currentPage);
    },

    jumpTo,

    next: async (): Promise<readonly PaymentHistoryEntry[]> => {
      if (_currentPage >= _storage.getPageCount() - 1) {
        return [];
      }
      _currentPage++;
      return await _storage.get(_currentPage);
    },

    fastForward: async (): Promise<readonly PaymentHistoryEntry[]> => {
      return await jumpTo(_storage.getPageCount() - 1);
    },

    hasMore(): boolean {
      return _currentPage < _storage.getPageCount() - 1;
    },
  });
}
