## [Unreleased]

### Breaking
- Removed `getClientVersion()` function
- Removed `AuthenticatorSession`
- The API for creating auth descriptor rules has been updated
- The API for `getBalancesByAccountId()` has been updated to be paginated
- **Participants, pubkeys, signers** All instances of these words, when related to auth descriptors, were now renamed to **signers**. This is a list of all the client-side changes:
    - `Connection.getAccountsByParticipantId` -> `Connection.getAccountsBySigner`
    - `Account.getAuthDescriptorsByParticipantId` -> `Account.getAuthDescriptorsBySigner`

### Changed 
- Upgrade postchain-client to 1.9.0.
- Added a function `getAccountsPaginated()` to get all accounts
