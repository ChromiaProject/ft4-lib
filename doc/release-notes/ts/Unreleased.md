## [Unreleased]

### Breaking
- Removed `getClientVersion()` function
- Removed `AuthenticatorSession`
- The API for creating auth descriptor rules has been updated
- The API for `getBalancesByAccountId()` has been updated to be paginated

### Changed 
- Upgrade postchain-client to 1.9.0.
- Added a function `getAccountsPaginated()` to get all accounts

### Added
- Added support for rules or TTL in login manager.