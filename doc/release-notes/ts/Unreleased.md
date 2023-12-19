## [Unreleased]

### Breaking
- Removed `getClientVersion()` function
- Removed `AuthenticatorSession`
- The API for creating auth descriptor rules has been updated
- The API for `getBalancesByAccountId()` has been updated to be paginated
- Removed type `TransferHistoryTransferArgs` and corresponding fields in `TransferHistoryEntry`

### Changed 
- Upgrade postchain-client to 1.9.0
- Added a function `getAccountsPaginated()` to get all accounts
- Added methods `getTransferDetails()` and `getTransferDetailsByAsset()` in `Connection`
