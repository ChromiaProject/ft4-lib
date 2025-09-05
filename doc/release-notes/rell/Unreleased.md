## [Unreleased] - 2025-xx-xx

### Breaking 💔

### Changed 🪙

- `map_transfer` and all crosschain transfer related queries now return the tx rid and op index of the transaction that entity was created in, besides the tx rid and op index of the initial transaction. This only affects the entities `canceled_transfers`, `unapplied_transfers`, `recalled_transfers`, `reverted_transfer`.

### Added ✅

- Two new fields to `canceled_transfers`, `unapplied_transfers`, `recalled_transfers`, `reverted_transfer`. They describe the operation the entity was created in, and default to `NO_TRANSACTION_RID` and `NO_OP_INDEX` to avoid breaking changes.

### Fixed 🔧
