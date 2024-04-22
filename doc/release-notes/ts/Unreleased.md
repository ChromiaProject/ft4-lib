## [Unreleased] - 2024-xx-xx

### Breaking 💔

- `registration.registerAccount` now accepts an IClient instead of a Connection.
- Removed the `buildUnsigned` method from TransactionBuilder. 
- All registration strategies can now be found inside the `registrationStrategy`-object. E.g., `registrationStrategy.fee(...)`
- `registerAccount` has been renamed to `registerAccountAdmin`
- Rename "signed" event to "built" in `crosschainTransfer` method
- Remove function `registerAccountEvmSignatures`
- Rename `nonce` query function to `authDescriptorCounter` and rename all the functions that call the query from `getNonce` to `getAuthDescriptorCounter`.

### Changed 🪙

- `crosschainTransfer` function returns a `TransferRef`, which can be used when resuming, reverting and recalling the transfer.
- Changed return type of methods `call` and `callWithoutNop` in `Session` to `Web3PromiEvent`
- Changed return type of methods in `AuthenticatedAccount` to `Web3PromiEvent`
- Changed return type of `registerAccount` to `Web3PromiEvent`

### Added ✅

- Added ttl to crosschainTransfer, which specifies after how much time the transaction should become invalid and must be reverted back to the starting chain.
- Possibility to revert uncompleted crosschain transfers after deadline has passed.
- Possibility to recall unclaimed register account transfers after timeout has passed.

- `addWithAnchoring` method in `TransactionBuilder` to get callback when transaction is anchored in a specific target
  chain.

- `sign` and `signAndSend` methods in `Session` to add your signature to an existing transaction.
- `gtv` object that contains functions for converting objects to/from `gtv`, e.g., `gtv.authDescriptorFromGtv(...)`

- `equals` and `compare` methods to `Amount`.

- Added `deleteAllAuthDescriptorsExceptMain` to `AuthenticatedAccount` interface.
- Added `updateMainAuthDescriptor` function to `AuthenticateAccount` interface.
- Added `getMainAuthDescriptor` to `Account` interface.
- Added `getAuthDescriptorById` to `Account` interface.

- Added `enabledRegistrationStrategies` query.

### Fixed 🔧

- Fix TS client build.
- Fix use of ethers library.
