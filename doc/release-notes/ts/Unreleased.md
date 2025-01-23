## [Unreleased] - 2024-xx-xx

### Breaking 💔

### Changed 🪙

### Added ✅

- Added `hasActiveLogin` to the `KeyStoreInteractor` interface, which returns whether a previous login that could be reused is found
- Added `connection` to `Account` and `AuthenticatedAccount` interface
- Added `get_api_version`. While version looks like "1.0.3", and it's difficult to parse, api version is an integer that is increased by one every time the API (queries and operations) changes. It will start at 1 for version 1.0.1, and it will return 0 for 1.0.0.
- Added optional parameter `ttl` to `AuthenticatedAccount.crosschainTransfer`
- Added in the `Connection` interface the query function `getAssetsFiltered` that retrieves paginated assets filtered by asset ids, name, symbol and type
- Added in the `Connection` interface the query function `getBalancesFiltered` that retrieves paginated balances filtered by account ids and asset ids 
- Added in the `Connection` interface the query function `getTransferHistoryEntriesFiltered` that retrieves paginated transfer history entries filtered by account ids, asset ids, transaction rids and op index
- Added in the `Connection` interface the query function `getCrosschainTransferHistoryEntriesFiltered` that retrieves paginated crosschain transfer history entries filtered by account ids, asset ids, transaction rids and op index

### Fixed 🔧

- added the `transferSubscription` strategy to `TransferStrategies`
