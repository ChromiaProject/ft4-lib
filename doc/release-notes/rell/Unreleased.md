## [Unreleased] - 2024-xx-xx

### Changed
 
- `create_account_with_auth` now requires the `auth_descriptor` to have `A` flag. You can no longer create account with no `A` flag auth descriptor by default.
- Add `get_first_allowed_auth_descriptor_by_signers` query

### Breaking

- Change `asset_data` to `asset` in queries `get_transfer_history`, `get_transfer_history_from_height` and `get_transfer_history_entry`.
