## [Unreleased] - 2024-xx-xx

### Breaking 💔
- Removed `getAssetBySymbol` (replaced with `getAssetsBySymbol`).
- Updated `registerCrosschainAsset` to accept asset id instead of asset object.

### Changed 🪙

### Added ✅
- Added `getAssetsBySymbol` to query list of all assets with the same symbol.
- Added `getAssetDetailsForCrosschainRegistration`, used to fetch asset details when registering a crosschain asset.
- Added `getTransferStrategyRules`, used to fetch transfer strategy rules configuration.
- Added `getTransferStrategyRulesGroupedByStrategy`, used to fetch transfer strategy rules configuration grouped by strategies and assets.

- Add `getEnabledRegistrationStrategies` to `Connection` interface

### Fixed 🔧
