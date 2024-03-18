## [Unreleased] - 2024-xx-xx

### Breaking 💔

### Changed 🪙

### Added ✅

- Operation `delete_auth_descriptors_for_signer` to delete all auth descriptors for a specific signer from an account
  (corresponding to query `get_account_auth_descriptors_by_signer`).

- `type` attribute in asset entity
- `get_assets_by_type` query
- `register_asset_with_type` admin operation

- Include `is_crosschain` flag in response from queries `get_transfer_history`, `get_transfer_history_from_height` 
  and `get_transfer_history_entry`.
- Include `blockchain_rid` in response from queries `get_transfer_details` and `get_transfer_details_by_asset`.

- Pending transfers when account is registered with direct strategies are completed.

- Include auth descriptor config (`max_rules` and `max_number_per_account`) in `get_config` query.

- 1 day expiration in default login config.

### Fixed 🔧