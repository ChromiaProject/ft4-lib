## [Unreleased] - 2024-xx-xx

### Breaking 💔
- Removed `get_asset_by_symbol` (replaced with `get_assets_by_symbol`)
- Updated `register_crosschain_asset` operation and function. Added asset id, asset type and uniqueness resolver arguments.
- Rename `get_paginated_asset_balances_by_name` function to `get_paginated_assets_by_name`

- Removed query `ft4.get_account_by_auth_descriptor`

### Changed 🪙
- Make `asset` entity `icon_url` attribute mutable.

### Added ✅
- Added `get_assets_by_symbol` query to get all registered assets with the same symbol.


### Fixed 🔧