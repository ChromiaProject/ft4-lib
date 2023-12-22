## [Unreleased]

### Breaking
- Removed `getClientVersion()` function
- Removed `AuthenticatorSession`
- The API for creating auth descriptor rules has been updated
- The API for `getBalancesByAccountId()` has been updated to be paginated
- Removed type `TransferHistoryTransferArgs` and corresponding fields in `TransferHistoryEntry`
- Removed entryIndex from `TransferHistoryEntry`
- Change the type of `lastUpdate` field of the `RateLimit` type from `number` to `Date`
- **brid -> blockchainRid** All instances of brid were changed to spell out blockchainRid, to avoid confusion over the meaning of the acronym. Where the name already said `chainBrid`, it became `chainRid`. This is a list of all the user-facing client-side changes:
    - `Asset.brid` -> `Asset.blockchainRid`
    - `AuthDataService.getBrid` -> `AuthDataService.getBlockchainRid`
- **Participants, pubkeys, signers** All instances of these words, when related to auth descriptors, were now renamed to **signers**. This is a list of all the client-side changes:
    - `Connection.getAccountsByParticipantId` -> `Connection.getAccountsBySigner`
    - `Account.getAuthDescriptorsByParticipantId` -> `Account.getAuthDescriptorsBySigner`

### Changed 
- Upgrade postchain-client to 1.9.0
- Added a function `getAccountsPaginated()` to get all accounts
- Added methods `getTransferDetails()` and `getTransferDetailsByAsset()` in `Connection`
- Exported `RateLimit` type
- Added `blockchainRid` to `Account` interface
