## [Unreleased] - 2025-xx-xx

### Breaking 💔

- All crosschain functions that emitted the `hop` event with the Blockchain RID
  of the hop will now emit the same event with the new `HopData` type.
- If an event listener passed to crosschain transfer operations throws, the
  transfer will be stopped and an error will be thrown.

### Changed 🪙

- The `Transfer` object now contains two extra optional fields. This keeps
  backwards compatibility towards older chains.
- `revertTransfer` and `recallUnclaimedTransfer` can now operate on transactions
  that they were called on and were interrupted. This means transactions can no
  longer get stuck, provided the chain has been updated to the latest FT4
  version. Older stuck transactions will stay stuck and they still need some
  manual intervention to fix.
- The crosschain transfer operations will now also emit a `hop` event at the
  final step, be it a `revert_transfer` or `complete_transfer`, allowing the
  user to receive a txRid, if needed.
- `getAppliedTx` now expects transaction body instead of transaction ID and
  calculates the transaction RID based on the receiving chain's merkle hash
  version, ensuring correct RID computation across chains with different merkle
  hash versions.

### Added ✅

- Added `HopData` type to represent a crosschain transfer hop, containing the ID
  of the blockchain the hop was performed on and the ID of the transaction
  called on that hop.
- `evaluatePendingTransfer`, which evaluates the state of a pending transaction
  to return the current status of it.
- `solvePendingCrosschainTransfer`, which uses `evaluatePendingTransfer` and
  automatically decides whether to revert, recall, or complete a pending
  transfer. If the transfer status is known, the other options are faster.
- Type `EvaluationResult`, used to represent the return value of the
  `evaluatePendingTransfer` function, and `SolveTransferEvents`, representing
  the list of events returned by `solvePendingCrosschainTransfer`.
- function `isUnclaimedTransfer`, which evaluates whether a _completed_
  transaction is an unclaimed transfer waiting to be claimed or reverted.
- Enum `UnclaimedTransferStatus`, the return type of `isUnclaimedTransfer`.
- `EventEmitterError`, thrown by `EventEmitter`
- `getMerkleHashVersion`, utility function which can extract the merkle hash
  version from multiple sources, all part of the new type `MerkleHashSource`.
- `getExpectedAccountIdFromMainAuthDescriptor`, which extracts the expected
  account ID if an account were to be registered with that auth descriptor.
- `transactionBuilder` now accepts `null` as the authenticator parameter,
  allowing building transactions for operations that don't require
  authentication (e.g., `nop` operations). When `null` is passed, it behaves the
  same as using `noopAuthenticator`.

- Migrated package manager from npm to pnpm. All scripts and commands now use
  `pnpm` instead of `npm`. The `package-lock.json` file has been replaced with
  `pnpm-lock.yaml`. Documentation files have been updated to reflect this
  change:
  - `README.md` - Updated installation and build instructions to use `pnpm`
    commands
  - `doc/release-steps.md` - Updated release workflow documentation to use
    `pnpm` commands for versioning and publishing
  - `scripts/update-docs.sh` - Updated documentation generation script to use
    `pnpm` for installation and execution
- `isTransferFullyApplied`, function to check if a transfer has been fully
  applied across all chains.

### Fixed 🔧

- Fixed an error on the TSDoc for `initTransfer` operation. The functionality
  stayed the same. This does not affect `crosschainTransfer` nor
  `account.crosschainTransfer`.

### Removed 🗑️
