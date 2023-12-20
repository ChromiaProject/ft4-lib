## [Unreleased]

### Breaking
- Removed `getClientVersion()` function
- Removed `AuthenticatorSession`
- The API for creating auth descriptor rules has been updated
- The API for `getBalancesByAccountId()` has been updated to be paginated
- Removed type `TransferHistoryTransferArgs` and corresponding fields in `TransferHistoryEntry`
- Change the type of `lastUpdate` field of the `RateLimit` type from `number` to `Date`
- **Participants, pubkeys, signers** All instances of these words, when related to auth descriptors, were now renamed to **signers**. This is a list of all the client-side changes:
    - `Connection.getAccountsByParticipantId` -> `Connection.getAccountsBySigner`
    - `Account.getAuthDescriptorsByParticipantId` -> `Account.getAuthDescriptorsBySigner`

### Changed 
- Upgrade postchain-client to 1.9.0
- Added a function `getAccountsPaginated()` to get all accounts
- Added methods `getTransferDetails()` and `getTransferDetailsByAsset()` in `Connection`
- Exported `RateLimit` type
