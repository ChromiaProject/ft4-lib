## [Unreleased]

### Breaking
- Removed `getClientVersion()` function
- Removed `AuthenticatorSession`
- The API for creating auth descriptor rules has been updated
- The API for `getBalancesByAccountId()` has been updated to be paginated
- Change the type of `lastUpdate` field of the `RateLimit` type from `number` to `Date`

### Changed 
- Upgrade postchain-client to 1.9.0.
- Added a function `getAccountsPaginated()` to get all accounts
- Exported `RateLimit` type
