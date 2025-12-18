## [Unreleased] - 2025-xx-xx

### Breaking 💔

- In the `chromia.yml > lib.ft4.core.accounts.strategies.transfer` section, specifying an asset `id` and `issuing_blockchain_rid` was previously intended to ignore the latter. The issuing blockchain RID will now be used to verify against - if one is provided, it will fail if there's a mismatch. This breaking change does **not** require a breaking database update, which means it's safe to update a blockchain to this version of FT4 (the `yml` might need to be updated, if any asset is misconfigured)

### Changed 🪙

### Added ✅

### Fixed 🔧

- An asset can now be specified just by ID in the `lib.ft4.core.accounts.strategies.transfer` config on the `chromia.yml`. Previously, due to a bug, this could be done but the `get_transfer_rules` query wouldn't recognize it, making frontends think the asset was not available
