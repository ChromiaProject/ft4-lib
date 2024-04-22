## [Unreleased] - 2024-xx-xx

### Breaking 💔

- added deadline field to init_transfer. The crosschain transfer will fail if applied after this timestamp. It can only be reverted.
- `latest_time` is now in `utils` instead of `accounts`
- Rename `_register_account()` function to `register_account()`
- Requires Rell 0.13.10
- Changed entity `ft4.crosschain.applied_transfers`
- Changed entity `ft4.account_creation_transfer`
- Add field `transaction` to entity `applied_transfers`
- Removed operation `ft4.register_account_evm_signatures` and use `ft4.evm_signatures` instead
- Remove `ft4.delete_all_auth_descriptors_exclude` operation (replaced with `ft4.delete_all_auth_descriptors_except_main`).
- Remove `is_strict` argument to `authenticate()` function. Now `auth_handlers` will always resolve to the handler with the most specific mount scope if no operation auth handler is found.
- Rename `ft4.get_auth_descriptor_nonce` to `ft4.get_auth_descriptor_counter`.

### Changed 🪙

### Added ✅

- Possibility to revert uncompleted crosschain transfers after deadline has passed.
- Possibility to recall unclaimed register account transfers after timeout has passed.
- Added `ft4.delete_all_auth_descriptors_except_main` operation that deletes all auth descriptors except main.
- Added `auth_flags` config to set mandatory and default auth flags.
- Updated `ft4.get_register_account_message` to add register account operation parameters to auth message
- Added `ft4.get_enabled_registration_strategies` query

### Fixed 🔧