## [Unreleased] - 2024-xx-xx

### Breaking 💔
- Removed `getAssetBySymbol` (replaced with `getAssetsBySymbol`).
- Updated `registerCrosschainAsset` to accept asset id instead of asset object.

### Changed 🪙

### Added ✅
- Added `getAssetsBySymbol` to query list of all assets with the same symbol.
- Added `getAssetDetailsForCrosschainRegistration`, used to fetch asset details when registering a crosschain asset.
- Added `hasCrosschainTransferExpired` to check if a specific transfer has expired.
- Add `getEnabledRegistrationStrategies` to `Connection` interface
- Added filter for `pendingTransferStrategies` to check expired or valid transfers only.
- Added `Filter` type as a generic type to filter in queries.

### Fixed 🔧
