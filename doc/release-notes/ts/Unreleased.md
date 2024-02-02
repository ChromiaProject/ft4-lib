## [Unreleased] - 2024-xx-xx

### Changed

- Do not allow TransactionBuilder.build() or TransactionBuilder.buildUnsigned() if there are OnAnchoredHandlers
- Default value for paginated queries has been changed from the previous 100, to instead use the value configured as default in the dApp on rell side
- Upgrade postchain-client to 1.9.0
- Added support for rules or TTL in login manager.

### Breaking

- Change `assetData` to `asset` in `TransferHistoryEntry`.
