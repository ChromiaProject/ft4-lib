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
- In the `Connection` interface the crosschain query function `getAssetOriginFiltered` that retrieves paginated asset origins filtered by asset ids
- In the `Connection` interface the crosschain query function `getAppliedTransfersFiltered` that retrieves paginated applied transfers filtered by init tx rids and init op index
- In the `Connection` interface the crosschain query function `getCanceledTransfersFiltered` that retrieves paginated canceled transfers filtered by init tx rids and init op index
- In the `Connection` interface the crosschain query function `getUnappliedTransfersFiltered` that retrieves paginated unapplied transfers filtered by init tx rids and init op index
- In the `Connection` interface the crosschain query function `getRecalledTransfersFiltered` that retrieves paginated recalled transfers filtered by init tx rids and init op index
- In the `Connection` interface the crosschain query function `getPendingTransfersFiltered` that retrieves paginated pending transfers filtered by transaction rids, op index and sender account id
- In the `Connection` interface the crosschain query function `getRevertedTransfersFiltered` that retrieves paginated reverted transfers filtered by init tx rids and init op index
- added `getAccountsFiltered`, `getAccountAuthDescriptorsFiltered`, `getMainAuthDescriptorsFiltered`, `getAuthDescriptorSignersFiltered`, `getRlStatesFiltered`,`getAccountCreationTransfersFiltered`, `getAccountLinksFiltered`, `getSubscriptionsFiltered` to the connection object. The functions all work the same - they have their respective filter and page limit and cursor as arguments. The filterable fields are the ones which are indexed in the corresponding rell entity.

### Fixed 🔧

- added the `transferSubscription` strategy to `TransferStrategies`
- fixed issue that caused invalid signature if the arguments were not specified on an operation in specific cases
