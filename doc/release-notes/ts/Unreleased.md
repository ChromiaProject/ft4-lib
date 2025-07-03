## [Unreleased] - 2025-xx-xx

### Breaking 💔

### Changed 🪙

- Update `postchain-client` to `2.0.2`

### Added ✅

- `getSystemAnchoringIccfProofOp` now sets the last used node from the node manager while calling `createIccfProofTx`

### Fixed 🔧

### Removed 🗑️

- Removed the checks for exposed operations, now allowing users to call operations that don't exist. This was done to prevent failure when an operation was exposed but not part of the app structure, as it commonly is in operations defined in GTV modules