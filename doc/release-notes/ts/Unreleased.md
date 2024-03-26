## [Unreleased] - 2024-xx-xx

### Breaking 💔

- `registration.registerAccount` now accepts an IClient instead of a Connection.
- Removed the `buildUnsigned` method from TransactionBuilder. 

### Changed 🪙

### Added ✅

- Added ttl to crosschainTransfer, which specifies after how much time the transaction should become invalid and must be reverted back to the starting chain.

- `addWithAnchoring` method in `TransactionBuilder` to get callback when transaction is anchored in a specific target
  chain.

- `sign` and `signAndSend` methods in `Session` to add your signature to an existing transaction.

### Fixed 🔧

- Fix TS client build.
- Fix use of ethers library.
