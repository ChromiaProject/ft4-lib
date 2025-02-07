## [Unreleased] - 2024-xx-xx

### Breaking 💔

### Changed 🪙

### Added ✅

- Added `hasActiveLogin` to the `KeyStoreInteractor` interface, which returns whether a previous login that could be reused is found
- Added `connection` to `Account` and `AuthenticatedAccount` interface
- Added `get_api_version`. While version looks like "1.0.3", and it's difficult to parse, api version is an integer that is increased by one every time the API (queries and operations) changes. It will start at 1 for version 1.0.1, and it will return 0 for 1.0.0.
- Added optional parameter `ttl` to `AuthenticatedAccount.crosschainTransfer`
- In the `Connection` interface the crosschain query function `getAssetOriginFiltered` that retrieves paginated asset origins filtered by asset ids
- In the `Connection` interface the crosschain query function `getAppliedTransfersFiltered` that retrieves paginated applied transfers filtered by init tx rids and init op index
- In the `Connection` interface the crosschain query function `getCanceledTransfersFiltered` that retrieves paginated canceled transfers filtered by init tx rids and init op index
- In the `Connection` interface the crosschain query function `getUnappliedTransfersFiltered` that retrieves paginated unapplied transfers filtered by init tx rids and init op index
- In the `Connection` interface the crosschain query function `getRecalledTransfersFiltered` that retrieves paginated recalled transfers filtered by init tx rids and init op index
- In the `Connection` interface the crosschain query function `getPendingTransfersFiltered` that retrieves paginated pending transfers filtered by transaction rids, op index and sender account id
- In the `Connection` interface the crosschain query function `getRevertedTransfersFiltered` that retrieves paginated reverted transfers filtered by init tx rids and init op index

### Fixed 🔧

- added the `transferSubscription` strategy to `TransferStrategies`
