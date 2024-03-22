## [Unreleased] - 2024-xx-xx

### Breaking 💔

- `registration.registerAccount` now accepts an IClient instead of a Connection.

### Changed 🪙

### Added ✅

- Added ttl to crosschainTransfer, which specifies after how much time the transaction should become invalid and must be reverted back to the starting chain.

### Fixed 🔧

- Fix TS client build.
